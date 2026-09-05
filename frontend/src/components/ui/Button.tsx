import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md transition-all duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 touch-manipulation disabled:opacity-50 disabled:pointer-events-none disabled:transform-none';

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs min-h-[36px] sm:min-h-[32px] tracking-[0.02em]',
    md: 'px-4 py-2 text-xs sm:text-sm min-h-[44px] tracking-[0.02em]',
    lg: 'px-6 py-3 text-sm sm:text-base min-h-[48px] tracking-[0.02em]',
  };

  const variantStyles = {
    primary:
      'bg-accent hover:bg-accent-secondary text-white shadow-sm hover:shadow-accent hover:-translate-y-0.5 active:translate-y-0',
    outline:
      'bg-transparent border border-foreground/30 hover:border-accent text-foreground hover:text-accent hover:bg-muted/50 active:translate-y-0',
    ghost:
      'bg-transparent text-muted-foreground hover:text-foreground hover:underline hover:decoration-accent underline-offset-4',
    danger:
      'bg-red-700 hover:bg-red-800 text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
