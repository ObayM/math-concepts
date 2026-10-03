'use client';

import { useRef, useState } from 'react';
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

async function post(url, body, signal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });
  const parsed = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  return { ok: res.ok, status: res.status, body: parsed };
}

export default function AiPanel({ source, onApply, onInsertScene }) {
  const [mode, setMode] = useState('lesson');
  const [instruction, setInstruction] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [findings, setFindings] = useState([]);
  const [retries, setRetries] = useState(0);
  const [lang, setLang] = useState('en');
  const [register, setRegister] = useState('msa-simple');
  const abortRef = useRef(null);

  const working = status === 'working';
  const hasRealSource = source && source.trim().split('\n').length > 3;
  const revising = mode === 'lesson' && hasRealSource;

  function fail(httpStatus, body) {
    setStatus('error');
    setError(
      httpStatus === 422
        ? { detail: body.detail, prism: body.prism }
        : { detail: body.error ?? 'Generation failed' }
    );
  }

  function start() {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus('working');
    setError(null);
    setFindings([]);
    return abortRef.current.signal;
  }

  async function run(priorSource, priorDetail) {
    const signal = start();
    try {
      if (mode === 'scene') {
        const {
          ok,
          status: code,
          body,
        } = await post(
          '/api/ai/generate-scene',
          {
            concept: instruction,
            context: hasRealSource ? source.slice(0, 4000) : '',
            lang,
            register,
          },
          signal
        );
        if (!ok) return fail(code, body);
        onInsertScene?.(body.prism.trim());
        setStatus('idle');
        return;
      }

      const topic = buildTopic(instruction, priorSource, priorDetail);
      const {
        ok,
        status: code,
        body,
      } = await post('/api/ai/generate-lesson', { topic, lang, register }, signal);
      if (!ok) return fail(code, body);
      onApply(body.prism);
      setFindings(body.findings ?? []);
      setStatus('idle');
    } catch (err) {
      if (err.name === 'AbortError') return;
      setStatus('error');
      setError({ detail: String(err) });
    }
  }

  async function handleGenerate() {
    if (!instruction.trim()) return;
    setRetries(0);
    await run(revising ? source : null, null);
  }

  async function handleRetry() {
    if (!error?.prism || retries >= MAX_RETRIES) return;
    setRetries((r) => r + 1);
    await run(error.prism, error.detail);
  }

  return (
    <div className="flex flex-col gap-3 border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-700">AI</p>
        <div className="flex">
          {[
            ['lesson', 'Lesson'],
            ['scene', 'Scene'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMode(value);
                setError(null);
                setFindings([]);
                setRetries(0);
              }}
              className={`border px-2 py-1 text-xs font-semibold ${
                mode === value
                  ? 'border-primary-600 bg-primary-600 text-white'
                  : 'border-neutral-300 bg-card text-neutral-600 hover:bg-neutral-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="h-24 w-full border border-neutral-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        placeholder={
          mode === 'scene'
            ? 'Describe one scene to drop in at the cursor...'
            : 'Describe the lesson, or an edit to make to the current draft...'
        }
        value={instruction}
        onChange={(e) => {
          setInstruction(e.target.value);
          setRetries(0);
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
        </select>
        {lang === 'ar' && (
          <select
            value={register}
            onChange={(e) => setRegister(e.target.value)}
            className="border border-neutral-300 px-2 py-1.5 text-sm"
          >
            <option value="msa-simple">Simple MSA</option>
            <option value="egyptian">Egyptian</option>
            <option value="msa-formal">Formal MSA</option>
          </select>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleGenerate} isLoading={working} disabled={!instruction.trim()}>
          {mode === 'scene' ? 'Insert scene' : revising ? 'Ask AI to revise' : 'Generate lesson'}
        </Button>
        {working && (
          <Button
            variant="ghost"
            onClick={() => {
              abortRef.current?.abort();
              setStatus('idle');
            }}
          >
            Cancel
          </Button>
        )}
      </div>

      {revising && (
        <p className="text-xs text-neutral-400">This replaces the whole lesson, and asks first.</p>
      )}

      {findings.length > 0 && (
        <div className="border border-warning-500 bg-warning-50 p-3 text-xs">
          <p className="font-bold text-warning-600">
            Applied, but {findings.length} thing{findings.length === 1 ? '' : 's'} to look at
          </p>
          <ul className="mt-1 space-y-1">
            {findings.map((f, i) => (
              <li key={i} className="text-neutral-700">
                <span className="font-mono text-neutral-400">{f.code}</span> {f.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="border border-danger-100 bg-danger-50 p-3 text-xs text-danger-700">
          <pre className="whitespace-pre-wrap">{error.detail}</pre>
          {error.prism && retries < MAX_RETRIES && (
            <Button
              className="mt-2"
              variant="secondary"
              size="sm"
              onClick={handleRetry}
              isLoading={working}
            >
              Ask AI to fix ({MAX_RETRIES - retries} left)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
