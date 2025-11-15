import { InputHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, Props>(function Input(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={clsx(
        'w-full h-10 px-3 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
      {...props}
    />
  );
});


