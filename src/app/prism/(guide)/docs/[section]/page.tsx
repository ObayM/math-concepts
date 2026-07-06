import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PRISM_DOCS } from '@/engine/lang/docs';
import PrismSectionView from '@/components/prism/PrismSectionView';
import OnThisPage from '@/components/prism/OnThisPage';

export function generateStaticParams() {
  return PRISM_DOCS.sections.map((s) => ({ section: s.id }));
}

export default async function DocSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section: sectionId } = await params;
  const idx = PRISM_DOCS.sections.findIndex((s) => s.id === sectionId);
  if (idx === -1) notFound();

  const section = PRISM_DOCS.sections[idx];
  const prev = PRISM_DOCS.sections[idx - 1];
  const next = PRISM_DOCS.sections[idx + 1];
  const tocItems = section.entries.map((e) => ({ id: `entry-${e.keyword}`, label: e.keyword }));

  return (
    <div className="prism-doc-layout">
      <div className="prism-doc-article">
        <PrismSectionView
          section={section}
          chapter={idx + 1}
          chapterCount={PRISM_DOCS.sections.length}
        />

        <nav className="prism-pager">
          {prev ? (
            <Link href={`/prism/docs/${prev.id}`} className="prism-pager-link prev">
              <span className="prism-pager-label">← Previous</span>
              <span className="prism-pager-title">{prev.title}</span>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link href={`/prism/docs/${next.id}`} className="prism-pager-link next">
              <span className="prism-pager-label">Next →</span>
              <span className="prism-pager-title">{next.title}</span>
            </Link>
          )}
        </nav>
      </div>

      <OnThisPage items={tocItems} />
    </div>
  );
}
