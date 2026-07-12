import { Icon } from './Icon';

export function MetricCard({
  label,
  value,
  icon,
  trend,
  highlight = false,
}: {
  label: string;
  value: string | number;
  icon?: string;
  trend?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`p-lg rounded-xl shadow-sm border transition-shadow hover:shadow-tonal ${
        highlight
          ? 'bg-primary text-on-primary border-primary'
          : 'bg-surface-container-lowest border-outline-variant'
      }`}
    >
      <span
        className={`text-label-sm font-label-sm uppercase tracking-wider ${
          highlight ? 'opacity-80' : 'text-on-surface-variant'
        }`}
      >
        {label}
      </span>
      <div className={`text-headline-lg font-headline-lg mt-xs ${highlight ? '' : 'text-primary'}`}>
        {value}
      </div>
      {trend && (
        <div className={`flex items-center gap-xs mt-xs ${highlight ? 'opacity-90' : 'text-secondary'}`}>
          {icon && <Icon name={icon} size={16} />}
          <span className="text-label-sm">{trend}</span>
        </div>
      )}
    </div>
  );
}
