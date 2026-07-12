import type { ReactNode } from 'react';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = { sm: 'max-w-[28rem]', md: 'max-w-[36rem]', lg: 'max-w-3xl' };

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-md">
      <div className="absolute inset-0 bg-inverse-surface/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative z-10 w-full ${SIZE_CLASSES[size]} bg-surface-container-lowest rounded-xl shadow-tonal-lg max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-lg py-md border-b border-outline-variant shrink-0">
          <h2 className="text-title-md font-title-md text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-xs rounded-full hover:bg-surface-container-high transition-colors"
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="px-lg py-md overflow-y-auto scrollbar-thin flex-1">{children}</div>
        {footer && (
          <div className="px-lg py-md border-t border-outline-variant flex justify-end gap-sm shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
