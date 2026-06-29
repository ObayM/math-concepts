'use client';
import katex from 'katex';

// renders lesson prose: $inline$ / $$display$$ math (KaTeX) + **bold** / *italic*
const tex = (src, displayMode) => katex.renderToString(src, { throwOnError: false, displayMode });

const TOKEN = /\$\$([^$]+)\$\$|\$([^$]+)\$|\*\*([^*]+)\*\*|\*([^*]+)\*/g;

export default function RichText({ children, className }) {
  const text = typeof children === 'string' ? children : '';
  const parts = [];
  let last = 0;
  let key = 0;
  let m;

  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) {
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: tex(m[1], true) }} />);
    } else if (m[2] != null) {
      parts.push(<span key={key++} dangerouslySetInnerHTML={{ __html: tex(m[2], false) }} />);
    } else if (m[3] != null) {
      parts.push(
        <strong key={key++} className="font-bold text-neutral-800">
          {m[3]}
        </strong>
      );
    } else if (m[4] != null) {
      parts.push(<em key={key++}>{m[4]}</em>);
    }
    last = TOKEN.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span className={className}>{parts}</span>;
}
