'use client';

import { useState } from 'react';
import Button from '@/components/admin/ui/Button';

const MAX_RETRIES = 2;

function buildTopic(instruction, priorSource, priorDetail) {
  if (!priorSource) return instruction;
  let topic = `Here is the current Prism lesson source:\n${priorSource}\n\nInstruction: ${instruction}\n\nReturn the FULL updated lesson source, not a diff.`;
  if (priorDetail) {
    topic += `\n\nYour previous attempt failed to compile:\n${priorDetail}\nFix the error.`;
  }
  return topic;
}

async function callGenerate(topic) {
  const res = await fetch('/api/ai/generate-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  const body = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  return { ok: res.ok, status: res.status, body };
}

export default function AiPanel({ source, onApply }) {
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [retries, setRetries] = useState(0);

  const hasRealSource = source && source.trim().split('\n').length > 3;

  async function handleGenerate() {
    if (!instruction.trim()) return;
    setStatus('working');
    setError(null);
    setRetries(0);

    const topic = buildTopic(instruction, hasRealSource ? source : null, null);
    const { ok, status: httpStatus, body } = await callGenerate(topic);

    if (ok) {
      onApply(body.prism);
      setStatus('idle');
      return;
    }
    setStatus('error');
    setError(
      httpStatus === 422
        ? { detail: body.detail, prism: body.prism }
        : { detail: body.error ?? 'Generation failed' }
    );
  }

  async function handleRetry() {
    if (!error?.prism || retries >= MAX_RETRIES) return;
    setStatus('working');
    setRetries((r) => r + 1);

    const topic = buildTopic(instruction, error.prism, error.detail);
    const { ok, status: httpStatus, body } = await callGenerate(topic);

    if (ok) {
      onApply(body.prism);
      setStatus('idle');
      setError(null);
      return;
    }
    setStatus('error');
    setError(
      httpStatus === 422
        ? { detail: body.detail, prism: body.prism }
        : { detail: body.error ?? 'Generation failed' }
    );
  }

  return (
    <div className="flex flex-col gap-3 border border-neutral-200 p-4">
      <p className="text-sm font-bold text-neutral-700">AI</p>
      <textarea
        className="h-24 w-full border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder="Describe the lesson, or an edit to make to the current draft..."
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />
      <Button
        onClick={handleGenerate}
        isLoading={status === 'working'}
        disabled={!instruction.trim()}
      >
        {hasRealSource ? 'Ask AI to revise' : 'Generate lesson'}
      </Button>
      {error && (
        <div className="border border-danger-100 bg-danger-50 p-3 text-xs text-danger-700">
          <pre className="whitespace-pre-wrap">{error.detail}</pre>
          {error.prism && retries < MAX_RETRIES && (
            <Button
              className="mt-2"
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              isLoading={status === 'working'}
            >
              Ask AI to fix ({MAX_RETRIES - retries} left)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
