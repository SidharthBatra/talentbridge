import type { ReactNode } from 'react';
import { Icon } from './Icon';

export function Spinner({ size = 24 }: { size?: number }) {
  return <Icon name="progress_activity" className="animate-spin text-primary" size={size} />;
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm py-xl text-on-surface-variant">
      <Spinner size={32} />
      <p className="text-body-md">{label}</p>
    </div>
  );
}

export function ErrorState({
  message = 'Something went wrong.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm py-xl text-center">
      <Icon name="error" className="text-error" size={36} />
      <p className="text-body-md text-on-surface-variant max-w-[24rem]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-primary font-label-sm hover:underline mt-xs"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-sm py-xl text-center px-md">
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center">
        <Icon name={icon} className="text-on-surface-variant" size={28} />
      </div>
      <p className="text-title-md font-title-md text-on-surface">{title}</p>
      {description && (
        <p className="text-body-md text-on-surface-variant max-w-[24rem]">{description}</p>
      )}
      {action}
    </div>
  );
}
