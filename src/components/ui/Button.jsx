import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

const base =
  'group inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-3.5 text-lg',
};

const press = 'border-b-[3px] active:border-b-0 active:translate-y-[3px]';

const variants = {
  primary: `bg-primary-600 hover:bg-primary-500 text-white border-primary-800 ${press}`,
  success: `bg-success-500 hover:bg-success-600 text-white border-success-600 ${press}`,
  accent: `bg-accent-600 hover:bg-accent-700 text-white border-accent-800 ${press}`,
  secondary: `bg-white hover:bg-primary-50 text-primary-700 border-primary-100 ${press}`,
  neutral: `bg-neutral-200 hover:bg-neutral-300 text-neutral-700 border-neutral-400 ${press}`,
  outline:
    'bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-200 hover:border-neutral-300',
  ghost: 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  as: Comp = 'button',
  fullWidth = false,
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) {
  const isButton = Comp === 'button';

  return (
    <Comp
      className={clsx(base, sizes[size], variants[variant], fullWidth && 'w-full', className)}
      disabled={isButton ? disabled || isLoading : undefined}
      {...props}
    >
      {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
      {!isLoading && icon}
      {children}
    </Comp>
  );
}
