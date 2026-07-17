import clsx from 'clsx';

const pressable =
  'shadow-[0_3px_0_0_var(--color-neutral-300)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-neutral-50 hover:border-neutral-300 active:translate-y-[3px] active:shadow-none';

export default function Card({
  as: Comp = 'div',
  className = '',
  pressable: isPressable = false,
  children,
  ...props
}) {
  return (
    <Comp
      className={clsx(
        'rounded-2xl border border-neutral-200 bg-white',
        isPressable && pressable,
        className
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
