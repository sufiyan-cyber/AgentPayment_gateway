import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accentTop?: boolean;
  hoverEffect?: boolean;
  elevated?: boolean;
  featured?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  accentTop = false,
  hoverEffect = false,
  elevated = false,
  featured = false,
  children,
  className = '',
  ...props
}) => {
  return (
    <div
      className={`
        relative rounded-lg border border-border bg-card text-foreground transition-all duration-200 ease-out
        ${elevated ? 'shadow-md' : 'shadow-sm'}
        ${featured ? 'bg-accent-muted border-accent/40' : 'bg-card'}
        ${accentTop || featured ? 'border-t-2 border-t-accent' : ''}
        ${hoverEffect ? 'hover:shadow-md hover:border-border-hover cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};
