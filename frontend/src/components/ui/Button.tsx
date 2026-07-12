import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: string;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-primary text-on-primary hover:bg-primary-container shadow-tonal disabled:opacity-50',
  secondary:
    'bg-surface-container-lowest text-primary border border-primary hover:bg-surface-container-low disabled:opacity-50',
  ghost: 'text-on-surface-variant hover:bg-surface-container-high disabled:opacity-40',
  danger: 'bg-error text-on-error hover:opacity-90 disabled:opacity-50',
  ai: 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90 shadow-tonal disabled:opacity-50',
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'py-xs px-sm text-body-md rounded-md gap-xs',
  md: 'py-sm px-md text-title-md rounded-lg gap-xs',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center font-semibold transition-all active:scale-[0.98] whitespace-nowrap ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <Icon name="progress_activity" className="animate-spin" size={18} />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      {children}
    </button>
  );
}
