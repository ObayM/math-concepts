import clsx from 'clsx';

export default function Card({ as: Comp = 'div', className = '', children, ...props }) {
  return (
    <Comp className={clsx('rounded-2xl border border-neutral-200 bg-white', className)} {...props}>
      {children}
    </Comp>
  );
}
