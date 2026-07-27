export class TutorError extends Error {}

export async function askTutor(body, { onChunk, signal } = {}) {
  let res;
  try {
    res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    throw new TutorError("Couldn't reach the tutor. Check your connection.");
  }

  if (res.status === 429) throw new TutorError('Slow down a moment, then ask again.');
  if (!res.ok || !res.body) throw new TutorError("The tutor isn't available right now.");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let answer = '';

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    answer += decoder.decode(value, { stream: true });
    onChunk?.(answer);
  }

  answer = answer.trim();
  if (!answer) throw new TutorError('The tutor had nothing to say. Try rephrasing it.');
  return answer;
}
