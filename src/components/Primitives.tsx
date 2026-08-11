import React, { useEffect, useRef, useState } from 'react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="section-label">{children}</div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost' | 'danger';
  className?: string;
}> = ({ children, onClick, disabled, variant = 'primary', className = '' }) => (
  <button className={`button button-${variant} ${className}`} onClick={onClick} disabled={disabled}>{children}</button>
);

export const TextInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}> = ({ value, onChange, placeholder, rows = 2, className = '' }) => (
  <textarea className={`text-input ${className}`} rows={rows} value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} />
);

export const MultiFieldDropdown: React.FC<{
  label: string;
  values: string[];
  options: string[];
  onChange: (values: string[]) => void;
}> = ({ label, values, options, onChange }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, []);

  const toggle = (option: string) => onChange(values.includes(option) ? values.filter(value => value !== option) : [...values, option]);
  return (
    <div className="multi" ref={ref}>
      <button type="button" className="multi-trigger" onClick={() => setOpen(value => !value)}>
        <span><small>{label}</small><strong>{values.length ? values.join(', ') : 'Sélectionner'}</strong></span><b>{open ? '⌃' : '⌄'}</b>
      </button>
      {open && <div className="multi-menu">{options.map(option => <button key={option} type="button" className={values.includes(option) ? 'selected' : ''} onClick={() => toggle(option)}><span>{option}</span>{values.includes(option) && <b>✓</b>}</button>)}</div>}
    </div>
  );
};
