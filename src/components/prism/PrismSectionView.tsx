'use client';
import type { DocEntry, DocSection } from '@/engine/lang/docs';
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
              <td>{p.description}</td>
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
      <div className="entry-header">
        <h3 className="entry-keyword">{entry.keyword}</h3>
      </div>

      <SyntaxPre code={entry.syntax} />

      <p className="entry-description">{entry.description}</p>

      {entry.props && entry.props.length > 0 && <PropTable props={entry.props} />}

      {entry.example && (
        <div style={{ marginTop: 16 }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--color-neutral-400)',
              marginBottom: 8,
            }}
          >
            example
          </p>
          <LiveSnippet code={entry.example} />
        </div>
      )}
    </div>
  );
}

export default function PrismSectionView({ section }: { section: DocSection }) {
  return (
    <section id={section.id} className="prism-section">
      <h1 className="section-title">{section.title}</h1>
      <p className="section-description">{section.description}</p>
      <div>
        {section.entries.map((e) => (
          <Entry key={e.keyword} entry={e} />
        ))}
      </div>
    </section>
  );
}
