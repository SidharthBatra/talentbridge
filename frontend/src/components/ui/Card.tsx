import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hoverable?: boolean;
}

export function Card({ children, hoverable = false, className = '', ...rest }: CardProps) {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm ${
        hoverable ? 'hover:shadow-tonal hover:border-primary transition-all' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
