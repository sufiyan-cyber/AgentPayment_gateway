import React from 'react';

export type BadgeVariant = 'allow' | 'step_up' | 'block' | 'accent' | 'neutral';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  className = '',
  icon,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    allow: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
    step_up: 'bg-amber-50 text-amber-900 border-amber-300/80',
    block: 'bg-rose-50 text-rose-900 border-rose-200/80',
    accent: 'bg-accent/10 text-accent border-accent/30',
    neutral: 'bg-muted text-muted-foreground border-border',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border font-mono text-[10px] sm:text-xs font-medium uppercase tracking-[0.12em] ${variantStyles[variant]} ${className}`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
};
