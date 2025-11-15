import { TextareaHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

type Props = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={clsx(
        'w-full px-3 py-2 rounded-md border bg-background outline-none focus:ring-2 focus:ring-primary/50',
        className
      )}
      {...props}
    />
  );
});


