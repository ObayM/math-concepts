export const askTutor = async (context, question) => {
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, question }),
  });

  if (res.status === 429) return 'Too many questions, wait a moment and try again.';
  if (!res.ok) return 'Something went wrong. Try again.';

  const data = await res.json();
  return data.answer || 'Something went wrong.';
};

export const generateScene = async (concept, difficulty = 'intermediate', context = '') => {
  const res = await fetch('/api/ai/generate-scene', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept, difficulty, context }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Scene generation failed');
  }

  return res.json();
};
