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

  const scope = res.headers.get('x-quota-scope');
  if (res.status === 429 && scope === 'day') {
    throw new TutorError("That's your tutor questions for today. Fresh batch tomorrow.");
  }
  if (res.status === 429 && scope === 'month') {
    throw new TutorError("That's your tutor questions for this month.");
  }
  if (res.status === 429) throw new TutorError('Slow down a moment, then ask again.');
  if (res.status === 503 && scope === 'budget') {
    throw new TutorError('The tutor is resting. Try again tomorrow.');
  }
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
