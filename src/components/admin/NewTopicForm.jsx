'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/admin/ui/Button';
import { buildTopic } from '@/components/admin/editor/AiPanel';

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  return { ok: res.ok, status: res.status, body: parsed };
}

export default function NewTopicForm() {
  const router = useRouter();
  const [idea, setIdea] = useState('');
  const [lang, setLang] = useState('en');
  const [register, setRegister] = useState('msa-simple');
  const [step, setStep] = useState(null);
  const [error, setError] = useState(null);
  const [made, setMade] = useState(null);

  async function generate(topic) {
    return post('/api/ai/generate-lesson', { topic, lang, register, standalone: true });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!idea.trim() || step) return;
    setError(null);
    setMade(null);
    try {
      setStep('Writing the lesson…');
      let gen = await generate(idea.trim());
      // one automatic fix-up, since the generate tier only allows two calls a minute
      if (gen.status === 422 && gen.body.prism) {
        setStep('Fixing a compile error…');
        gen = await generate(buildTopic(idea.trim(), gen.body.prism, gen.body.detail));
      }
      if (!gen.ok) {
        setError(gen.body.detail ?? gen.body.error ?? 'Generation failed');
        return;
      }

      setStep('Publishing…');
      const saved = await post('/api/admin/topics', {
        source: gen.body.prism,
        lang,
        publish: true,
      });
      if (!saved.ok) {
        setError(saved.body.detail ?? saved.body.error ?? 'Save failed');
        return;
      }
      if (!saved.body.published) {
        router.push(`/admin/content/lessons/${saved.body.id}/edit`);
        return;
      }
      setMade(saved.body);
      setIdea('');
      router.refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setStep(null);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2">
      <textarea
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="What should it teach? e.g. why the chain rule multiplies the derivatives"
        className="rounded-none border border-neutral-300 bg-card px-3 py-2 text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          aria-label="Language"
          className="border border-neutral-300 bg-card px-2 py-1.5 text-sm"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        {lang === 'ar' && (
          <select
            value={register}
            onChange={(e) => setRegister(e.target.value)}
            aria-label="Register"
            className="border border-neutral-300 bg-card px-2 py-1.5 text-sm"
          >
            <option value="msa-simple">MSA, simple</option>
            <option value="egyptian">Egyptian</option>
            <option value="msa-formal">MSA, formal</option>
          </select>
        )}
        <Button type="submit" size="sm" disabled={!!step || !idea.trim()}>
          {step ?? 'Generate and publish'}
        </Button>
      </div>
      {made && (
        <p className="text-sm text-success-700">
          Published {made.key}.{' '}
          <a href={made.url} className="underline">
            Open it
          </a>
        </p>
      )}
      {error && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap border border-danger-100 bg-danger-50 p-2 text-xs text-danger-600">
          {error}
        </pre>
      )}
      <p className="text-xs text-neutral-400">
        If the content check blocks publishing, it saves a draft and opens the editor.
      </p>
    </form>
  );
}
