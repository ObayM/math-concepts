import clsx from 'clsx';

export default function Input({ className = '', ...props }) {
  return (
    <input
      className={clsx(
        'rounded-none border border-neutral-300 bg-card px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500',
        className
      )}
      {...props}
    />
  );
}
