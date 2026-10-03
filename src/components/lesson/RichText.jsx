'use client';
import katex from 'katex';
import { texColors } from '@/engine/colors';
import { ROLE_EVENT } from '@/engine/runtime/roleEvent';
import { arabicMath } from '@/engine/artex';
import { useMathNotation } from '@/engine/artex/context';

export const proseClass = 'block max-w-[42rem] text-xl leading-[1.75] font-normal text-neutral-700';

const LATIN = {
  dir: 'ltr',
  html: (src, displayMode) =>
    katex.renderToString(texColors(src), { throwOnError: false, displayMode }),
};

const ARABIC = { dir: undefined, html: (src, displayMode) => arabicMath(src, displayMode).html };

const announceRole = (role) =>
  document.dispatchEvent(new CustomEvent(ROLE_EVENT, { detail: role }));

const DISPLAY_ONLY = /^\$\$([^$]+)\$\$$/;

function renderInline(text, math) {
  const re =
    /\$\$([^$]+)\$\$|\$([^$]+)\$|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]\n]+)\]\{(primary|accent|success|danger|warning|neutral)(?::([\w-]+))?\}|\[([^\]\n]+)\]\(lesson:([a-z0-9-]+)\)/g;
  const parts = [];
  let last = 0;
  let key = 0;
  let m;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    if (m[1] != null) {
      parts.push(
        <span
          key={key++}
          dir={math.dir}
          dangerouslySetInnerHTML={{ __html: math.html(m[1], true) }}
        />
      );
    } else if (m[2] != null) {
      parts.push(
        <span
          key={key++}
          dir={math.dir}
          dangerouslySetInnerHTML={{ __html: math.html(m[2], false) }}
        />
      );
    } else if (m[3] != null) {
      parts.push(
        <strong key={key++} className="font-bold text-neutral-900">
          {renderInline(m[3], math)}
        </strong>
      );
    } else if (m[4] != null) {
      parts.push(
        <em key={key++} className="italic text-neutral-800">
          {renderInline(m[4], math)}
        </em>
      );
    } else if (m[5] != null) {
      const role = m[7];
      parts.push(
        <span
          key={key++}
          data-role={role}
          className="font-semibold"
          style={{ color: `var(--color-${m[6]}-600)` }}
          onPointerEnter={role ? () => announceRole(role) : undefined}
          onPointerLeave={role ? () => announceRole(null) : undefined}
        >
          {renderInline(m[5], math)}
        </span>
      );
    } else if (m[8] != null) {
      parts.push(
        <a
          key={key++}
          href={`/l/${m[9]}`}
          className="font-semibold text-primary-600 underline decoration-2 underline-offset-4"
        >
          {renderInline(m[8], math)}
        </a>
      );
    }
    last = re.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function RichText({ children, className = '' }) {
  const math = useMathNotation() === 'ar' ? ARABIC : LATIN;
  const text = typeof children === 'string' ? children : '';
  const cls = className ? `rich-text ${className}` : 'rich-text';
  const paragraphs = text.split(/\n\n+/);

  if (paragraphs.length <= 1) {
    return <span className={cls}>{renderInline(text, math)}</span>;
  }

  return (
    <div className={cls}>
      {paragraphs.map((para, i) => {
        const dm = para.trim().match(DISPLAY_ONLY);
        if (dm) {
          return (
            <div
              key={i}
              dir={math.dir}
              className={i > 0 ? 'mt-5 text-center' : 'text-center'}
              dangerouslySetInnerHTML={{ __html: math.html(dm[1], true) }}
            />
          );
        }
        return (
          <p key={i} className={i > 0 ? 'mt-4' : ''}>
            {renderInline(para, math)}
          </p>
        );
      })}
    </div>
  );
}
