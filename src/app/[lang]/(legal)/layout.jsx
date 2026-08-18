export default function LegalLayout({ children }) {
  return (
    <div className="bg-app min-h-[calc(100dvh-var(--nav-h))]">
      <article className="prose-legal mx-auto max-w-2xl px-4 py-16 sm:px-6">{children}</article>
    </div>
  );
}
