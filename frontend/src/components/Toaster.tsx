import { useNavigate } from 'react-router-dom';
import { useToastStore, type ToastVariant } from '../store/toastStore';
import { Icon } from './ui/Icon';

const VARIANT_STYLES: Record<ToastVariant, { icon: string; classes: string }> = {
  success: { icon: 'check_circle', classes: 'bg-secondary-container text-on-secondary-container' },
  error: { icon: 'error', classes: 'bg-error-container text-on-error-container' },
  info: { icon: 'info', classes: 'bg-primary-fixed text-on-primary-fixed-variant' },
};

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const navigate = useNavigate();

  return (
    <div className="fixed top-md right-md z-[100] flex flex-col gap-xs w-full max-w-[24rem]">
      {toasts.map((t) => {
        const style = VARIANT_STYLES[t.variant];
        const clickable = Boolean(t.link);
        return (
          <div
            key={t.id}
            className={`flex items-start gap-sm p-md rounded-lg shadow-tonal-lg border border-outline-variant/50 ${style.classes} animate-in ${clickable ? 'cursor-pointer hover:brightness-95' : ''}`}
            role={clickable ? 'link' : 'status'}
            tabIndex={clickable ? 0 : undefined}
            onClick={() => {
              if (t.link) {
                dismiss(t.id);
                navigate(t.link);
              }
            }}
            onKeyDown={(e) => {
              if (clickable && (e.key === 'Enter' || e.key === ' ')) {
                dismiss(t.id);
                navigate(t.link!);
              }
            }}
          >
            <Icon name={style.icon} filled />
            <div className="flex-1 min-w-0">
              <p className="text-body-md font-semibold">{t.title}</p>
              {t.description && <p className="text-label-sm opacity-90 mt-[2px]">{t.description}</p>}
              {clickable && <p className="text-label-sm underline mt-[2px]">View application →</p>}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="opacity-60 hover:opacity-100"
              aria-label="Dismiss"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
