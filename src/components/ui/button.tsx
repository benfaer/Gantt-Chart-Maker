import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = 'default', size = 'md', ...props },
  ref
) {
  const base = 'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';
  const variants = {
    default: 'gradient-primary text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-0.5',
    outline: 'border-2 border-border bg-card text-foreground hover:bg-muted hover:border-primary/30 shadow-soft',
    ghost: 'text-foreground hover:bg-muted/80',
    destructive: 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:-translate-y-0.5',
  } as const;
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-9 px-4 text-sm',
    lg: 'h-10 px-5 text-base',
    icon: 'h-10 w-10',
  } as const;

  return (
    <button ref={ref} className={clsx(base, variants[variant], sizes[size], className)} {...props} />
  );
});


