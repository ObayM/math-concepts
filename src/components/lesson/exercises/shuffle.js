// deterministic so a tray or column doesn't reorder on every render, but still
// varies per exercise — seeded off the content, never Math.random
export function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function seededShuffle(items, seed) {
  let s = seed || 1;
  const rand = () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function shuffledOrder(n, seed) {
  const order = seededShuffle(
    Array.from({ length: n }, (_, i) => i),
    seed
  );
  if (n > 1 && order.every((v, i) => v === i)) order.push(order.shift());
  return order;
}
