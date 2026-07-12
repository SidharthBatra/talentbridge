interface IconProps {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
}

/** Material Symbols Outlined glyph — matches the Stitch reference exactly. */
export function Icon({ name, className = '', filled = false, size = 20 }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${filled ? 'filled' : ''} ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}
