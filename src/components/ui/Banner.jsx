import { Sparkles } from 'lucide-react';

export default function Banner({ title, children, action, className = '' }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border border-primary-200 bg-primary-50/60 p-4 sm:p-5 ${className}`}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600">
        <Sparkles className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        {title && <p className="font-bold text-neutral-900">{title}</p>}
        {children && <p className="mt-0.5 text-sm leading-relaxed text-neutral-600">{children}</p>}
        {action && <div className="mt-2.5 text-sm font-semibold">{action}</div>}
      </div>
    </div>
  );
}
