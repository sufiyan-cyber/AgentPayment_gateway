import React from 'react';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({
  children,
  className = '',
  badge,
}) => {
  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <span className="h-px flex-1 bg-border" />
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-accent">
          {children}
        </span>
        {badge}
      </div>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
};
