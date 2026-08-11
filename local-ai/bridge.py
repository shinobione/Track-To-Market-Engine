#!/usr/bin/env python3
"""Track-To-Market local AI bridge.

Zero third-party Python dependencies. It proxies a user-supplied ComfyUI API-format
workflow and exposes a tiny localhost API for the GitHub Pages / Studio frontend.
"""
from __future__ import annotations

import base64
import json
import os
import pathlib
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = pathlib.Path(__file__).resolve().parent
WORKFLOW_PATH = pathlib.Path(os.environ.get("TTME_COMFY_WORKFLOW", ROOT / "workflow_api.json"))
COMFY = os.environ.get("TTME_COMFY_URL", "http://127.0.0.1:8188").rstrip("/")
HOST = "127.0.0.1"
PORT = int(os.environ.get("TTME_LOCAL_PORT", "8789"))
ALLOWED_ORIGINS = {
    "https://shinobione.github.io",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
}

FAVICON_SVG = b'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="18" fill="#081014"/>
<rect x="1" y="1" width="62" height="62" rx="17" fill="none" stroke="#38d7e8" stroke-opacity=".45" stroke-width="2"/>
<text x="32" y="40" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="24" font-weight="800" letter-spacing="-1" fill="#f5f8fa">TM</text>
<circle cx="49" cy="18" r="3" fill="#38d7e8"/>
</svg>'''


def http_json(url: str, data=None, timeout=10):
    headers = {"Content-Type": "application/json"} if data is not None else {}
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def comfy_health():
    try:
        return http_json(f"{COMFY}/system_stats", timeout=8)
    except Exception as stats_exc:
        # `/system_stats` can be slow during the first CUDA/model initialization.
        # A responsive `/queue` still proves that the ComfyUI HTTP API is alive.
        try:
            http_json(f"{COMFY}/queue", timeout=3)
            return {"devices": [], "degraded": True, "stats_error": str(stats_exc)}
        except Exception:
            raise stats_exc


def load_workflow():
    if not WORKFLOW_PATH.exists():
        raise FileNotFoundError(f"Missing {WORKFLOW_PATH.name}. Export a ComfyUI workflow in API format to this path.")
    return json.loads(WORKFLOW_PATH.read_text(encoding="utf-8"))


def find_nodes(workflow):
    by_class = {}
    for node_id, node in workflow.items():
        by_class.setdefault(node.get("class_type", ""), []).append((node_id, node))

    text_nodes = by_class.get("CLIPTextEncode", [])
    sampler_candidates = by_class.get("KSampler", []) + by_class.get("KSamplerAdvanced", [])
    latent_candidates = []
    for class_name, nodes in by_class.items():
        if "LatentImage" in class_name:
            latent_candidates.extend(nodes)
    save_candidates = by_class.get("SaveImage", [])

    if not text_nodes or not sampler_candidates or not latent_candidates or not save_candidates:
        raise RuntimeError("Workflow must contain CLIPTextEncode, KSampler, a LatentImage node and SaveImage.")

    # Official/simple workflows generally list positive then negative conditioning.
    positive = text_nodes[0]
    negative = text_nodes[1] if len(text_nodes) > 1 else None
    return {
        "positive": positive,
        "negative": negative,
        "sampler": sampler_candidates[0],
        "latent": latent_candidates[0],
        "save": save_candidates[-1],
    }


def prepare_workflow(prompt: str, width: int, height: int, seed: int):
    workflow = load_workflow()
    nodes = find_nodes(workflow)
    nodes["positive"][1]["inputs"]["text"] = prompt
    if nodes["negative"]:
        nodes["negative"][1]["inputs"]["text"] = "text, letters, logo, watermark, frame, mockup, UI, blurry, low quality"
    sampler_inputs = nodes["sampler"][1]["inputs"]
    if "seed" in sampler_inputs:
        sampler_inputs["seed"] = int(seed)
    elif "noise_seed" in sampler_inputs:
        sampler_inputs["noise_seed"] = int(seed)
    latent_inputs = nodes["latent"][1]["inputs"]
    if "width" in latent_inputs:
        latent_inputs["width"] = int(width)
    if "height" in latent_inputs:
        latent_inputs["height"] = int(height)
    nodes["save"][1]["inputs"]["filename_prefix"] = f"TTME_{seed}"
    return workflow


def queue_and_wait(workflow, timeout=420):
    queued = http_json(f"{COMFY}/prompt", {"prompt": workflow}, timeout=10)
    prompt_id = queued.get("prompt_id")
    if not prompt_id:
        raise RuntimeError(f"ComfyUI rejected workflow: {queued}")
    deadline = time.time() + timeout
    while time.time() < deadline:
        history = http_json(f"{COMFY}/history/{prompt_id}", timeout=10)
        entry = history.get(prompt_id)
        if entry:
            outputs = entry.get("outputs", {})
            for output in outputs.values():
                images = output.get("images") or []
                if images:
                    return images[0]
            status = entry.get("status", {})
            if status.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI execution failed: {status}")
        time.sleep(0.8)
    raise TimeoutError("ComfyUI generation timed out.")


def fetch_image(ref):
    query = urllib.parse.urlencode({
        "filename": ref["filename"],
        "subfolder": ref.get("subfolder", ""),
        "type": ref.get("type", "output"),
    })
    with urllib.request.urlopen(f"{COMFY}/view?{query}", timeout=30) as res:
        payload = res.read()
        mime = res.headers.get_content_type() or "image/png"
    return f"data:{mime};base64,{base64.b64encode(payload).decode('ascii')}"


class Handler(BaseHTTPRequestHandler):
    server_version = "TTME-Local-AI/0.1.3"

    def cors(self):
        origin = self.headers.get("Origin") or ""
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
        self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Cache-Control", "no-store")

    def send_json(self, status, body):
        encoded = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def send_bytes(self, status, payload, content_type):
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.path in ("/favicon.ico", "/favicon.svg"):
            return self.send_bytes(200, FAVICON_SVG, "image/svg+xml")
        if self.path != "/health":
            return self.send_json(404, {"error": "Not found"})
        try:
            stats = comfy_health()
            devices = stats.get("devices") or []
            device = devices[0] if devices else {}
            ready = WORKFLOW_PATH.exists()
            self.send_json(200, {
                "ok": True,
                "ready": ready,
                "service": "SHINOBIWAN Track-To-Market Local AI",
                "backend": "ComfyUI",
                "model": "workflow_api.json" if ready else None,
                "gpu": device.get("name"),
                "vram": device.get("vram_total"),
                "degradedStats": bool(stats.get("degraded")),
                "message": "Ready" if ready else "ComfyUI online; workflow_api.json missing",
            })
        except Exception as exc:
            self.send_json(200, {
                "ok": True,
                "ready": False,
                "service": "TTME Local AI",
                "backend": "ComfyUI",
                "message": f"ComfyUI offline: {exc}",
            })

    def do_POST(self):
        if self.path != "/api/image":
            return self.send_json(404, {"error": "Not found"})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            prompt = str(payload.get("prompt") or "").strip()
            if not prompt:
                return self.send_json(400, {"error": "Prompt is required"})
            width = max(256, min(1536, int(payload.get("width", 1024))))
            height = max(256, min(1536, int(payload.get("height", 576))))
            seed = max(1, int(payload.get("seed", 1)))
            workflow = prepare_workflow(prompt, width, height, seed)
            ref = queue_and_wait(workflow)
            self.send_json(200, {
                "dataUrl": fetch_image(ref),
                "model": "ComfyUI local workflow",
                "seed": seed,
                "width": width,
                "height": height,
            })
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def log_message(self, fmt, *args):
        print(f"[TTME Local] {self.address_string()} - {fmt % args}")


if __name__ == "__main__":
    print(f"Track-To-Market Local AI bridge -> http://{HOST}:{PORT}")
    print(f"ComfyUI backend -> {COMFY}")
    print(f"Workflow -> {WORKFLOW_PATH}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
