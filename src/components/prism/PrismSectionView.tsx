'use client';
import type { DocEntry, DocSection } from '@/engine/lang/docs';
import InlineMd from '@/components/prism/InlineMd';
import LiveSnippet from '@/components/prism/LiveSnippet';
import SyntaxPre from '@/components/prism/SyntaxPre';

function PropTable({ props }: { props: NonNullable<DocEntry['props']> }) {
  return (
    <div className="prop-table-wrap">
      <table className="prop-table">
        <thead>
          <tr>
            <th>prop</th>
            <th>type</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          {props.map((p) => (
            <tr key={p.name}>
              <td>
                <span className="prop-name">{p.name}</span>
                {p.required && <span className="prop-required">*</span>}
              </td>
              <td>
                <span className="prop-type">{p.type}</span>
              </td>
              <td>
                <InlineMd text={p.description} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Entry({ entry }: { entry: DocEntry }) {
  return (
    <div id={`entry-${entry.keyword}`} className="prism-entry">
      <h3 className="entry-keyword">
        {entry.keyword}
        <a
          href={`#entry-${entry.keyword}`}
          className="entry-anchor"
          aria-label={`Link to ${entry.keyword}`}
        >
          #
        </a>
      </h3>

      <p className="entry-description">
        <InlineMd text={entry.description} />
      </p>

      <SyntaxPre code={entry.syntax} />

      {entry.props && entry.props.length > 0 && <PropTable props={entry.props} />}

      {entry.example && (
        <div className="entry-example">
          <p className="entry-example-label">Example</p>
          <LiveSnippet code={entry.example} />
        </div>
      )}
    </div>
  );
}

export default function PrismSectionView({
  section,
  chapter,
  chapterCount,
}: {
  section: DocSection;
  chapter?: number;
  chapterCount?: number;
}) {
  return (
    <section id={section.id} className="prism-section">
      {chapter != null && (
        <p className="section-eyebrow">
          Guide · {String(chapter).padStart(2, '0')}
          {chapterCount ? ` of ${String(chapterCount).padStart(2, '0')}` : ''}
        </p>
      )}
      <h1 className="section-title">{section.title}</h1>
      <p className="section-description">
        <InlineMd text={section.description} />
      </p>
      <div>
        {section.entries.map((e) => (
          <Entry key={e.keyword} entry={e} />
        ))}
      </div>
    </section>
  );
}
