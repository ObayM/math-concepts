import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const base =
  'inline-flex items-center justify-center gap-2 rounded-none font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed';

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
};

const variants = {
  primary: 'bg-primary-600 hover:bg-primary-700 text-white border border-primary-600',
  secondary: 'bg-card hover:bg-neutral-50 text-neutral-700 border border-neutral-300',
  outline: 'bg-card hover:bg-neutral-50 text-neutral-600 border border-neutral-200',
  ghost: 'text-neutral-500 hover:bg-neutral-100 border border-transparent',
  danger: 'bg-danger-600 hover:bg-danger-700 text-white border border-danger-600',
};

export default function Button({
  children,
  variant = 'secondary',
  size = 'sm',
  fullWidth = false,
  isLoading = false,
  className = '',
  disabled,
  ...props
}) {
  return (
    <button
      className={clsx(base, sizes[size], variants[variant], fullWidth && 'w-full', className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
