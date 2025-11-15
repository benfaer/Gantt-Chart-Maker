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
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none';
  const variants = {
    default: 'bg-primary text-white hover:opacity-90',
    outline: 'border border-gray-300 dark:border-gray-700 hover:bg-muted',
    ghost: 'hover:bg-muted',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
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


