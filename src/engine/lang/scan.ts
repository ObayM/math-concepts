// "quotes", (parens) and [brackets] stay atomic so options, coord pairs and
// interpolated labels each come out as one token
export function scanLine(line: string): string[] {
  const tokens: string[] = [];
  const n = line.length;
  let i = 0;

  while (i < n) {
    const c = line[i];
    if (c === ' ' || c === '\t') {
      i++;
      continue;
    }

    let depth = 0;
    let inStr = false;
    let j = i;
    while (j < n) {
      const ch = line[j];
      if (inStr) {
        if (ch === '"') inStr = false;
        j++;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      else if ((ch === ' ' || ch === '\t') && depth === 0) break;
      j++;
    }
    tokens.push(line.slice(i, j));
    i = j;
  }

  return tokens;
}
