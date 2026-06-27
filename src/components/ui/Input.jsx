import clsx from 'clsx';

export default function Input({ icon, trailing, className = '', ...props }) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
          {icon}
        </span>
      )}
      <input
        className={clsx(
          'block w-full rounded-xl border border-neutral-200 bg-neutral-50 py-3 text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 sm:text-sm',
          icon ? 'pl-10' : 'pl-3',
          trailing ? 'pr-10' : 'pr-3',
          className
        )}
        {...props}
      />
      {trailing && (
        <span className="absolute inset-y-0 right-0 flex items-center pr-3">{trailing}</span>
      )}
    </div>
  );
}
