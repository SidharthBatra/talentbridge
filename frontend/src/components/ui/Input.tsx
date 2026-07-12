import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  children: ReactNode;
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="space-y-xs">
      {label && (
        <label className="block text-on-surface font-label-sm text-label-sm">{label}</label>
      )}
      {children}
      {error && <p className="text-error text-label-sm">{error}</p>}
      {!error && hint && <p className="text-on-surface-variant text-label-sm">{hint}</p>}
    </div>
  );
}

const fieldBase =
  'w-full px-md py-sm bg-surface-container-lowest border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-body-md text-body-md outline-none disabled:opacity-50 disabled:bg-surface-container-low';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Input({ label, error, hint, className = '', ...rest }: InputProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <input
        className={`${fieldBase} ${error ? 'border-error' : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = '', ...rest }: TextareaProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <textarea
        className={`${fieldBase} min-h-[100px] resize-y ${error ? 'border-error' : ''} ${className}`}
        {...rest}
      />
    </FieldWrapper>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Select({ label, error, hint, className = '', children, ...rest }: SelectProps) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <select className={`${fieldBase} ${error ? 'border-error' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldWrapper>
  );
}
