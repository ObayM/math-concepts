import clsx from 'clsx';

const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-10 h-10 border-4',
  lg: 'w-24 h-24 border-4',
};

export default function Spinner({ size = 'md', className = '' }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={clsx(
        'animate-spin rounded-full border-primary-100 border-t-primary-500',
        sizes[size],
        className
      )}
    />
  );
}
