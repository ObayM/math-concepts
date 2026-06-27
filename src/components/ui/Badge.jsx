import clsx from 'clsx';

const variants = {
  primary: 'bg-primary-100 text-primary-700',
  success: 'bg-success-100 text-success-700',
  neutral: 'bg-neutral-200 text-neutral-500',
  accent: 'bg-accent-100 text-accent-700',
  warning: 'bg-warning-100 text-warning-600',
};

export default function Badge({ variant = 'neutral', className = '', children, ...props }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
