'use client';
import clsx from 'clsx';
import { useT } from '@/components/i18n/LocaleProvider';

const sizes = {
  sm: 'w-5 h-5 border-2',
  md: 'w-10 h-10 border-4',
  lg: 'w-24 h-24 border-4',
};

export default function Spinner({ size = 'md', className = '' }) {
  const t = useT();
  return (
    <div
      role="status"
      aria-label={t('common.loading')}
      className={clsx(
        'animate-spin rounded-full border-primary-100 border-t-primary-500',
        sizes[size],
        className
      )}
    />
  );
}
