'use client';

import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { useTranslations } from 'next-intl';
import { Play, Loader2 } from 'lucide-react';

/**
 * AsterPlayground — VitePress AsterPlayground.vue（1074 行）的 React 移植
 * （ADR 0018 Phase 3）。设计对齐 aster-cloud（token 配色 + JetBrains Mono）。
 *
 * 编译/执行走后端 /api/v1/policies/evaluate-source（与原站同一真实路径），
 * 不在前端做语义——保持可信执行链。文案走 next-intl（playground namespace）。
 *
 * 后续里程碑：语法高亮扩展、多示例下拉、决策 trace 面板、AI 解释。
 */

const API_BASE =
  process.env.NEXT_PUBLIC_ASTER_POLICY_API_URL || 'https://policy.aster-lang.dev';

const SAMPLE = `Module LoanApproval.

Rule approve given applicant:
  if applicant.creditScore is at least 700
    and applicant.income is greater than 50000
  then return "approved"
  else return "manual review".`;

interface EvalResult {
  result?: unknown;
  error?: string;
}

export default function AsterPlayground() {
  const t = useTranslations('playground');
  const [source, setSource] = useState(SAMPLE);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/policies/evaluate-source`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source, locale: 'en-US' }),
      });
      const body = (await res.json()) as EvalResult;
      setResult(res.ok ? body : { error: body.error ?? `HTTP ${res.status}` });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
        {t('title')}
      </h1>
      <p className="mt-2 text-fg-muted">{t('subtitle')}</p>

      <label className="mt-8 block text-sm font-semibold text-fg">{t('sourceLabel')}</label>
      <div className="mt-2 overflow-hidden rounded-xl border border-border shadow-brand">
        <CodeMirror
          value={source}
          height="220px"
          onChange={setSource}
          basicSetup={{ lineNumbers: true, foldGutter: false }}
        />
      </div>

      <button
        onClick={run}
        disabled={running}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-brand transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? t('running') : t('run')}
      </button>

      {result && (
        <div className="mt-6">
          {result.error !== undefined ? (
            <>
              <p className="text-sm font-semibold text-danger">{t('errorLabel')}</p>
              <pre className="mt-1 overflow-auto rounded-lg border border-danger-subtle bg-danger-subtle/40 p-3 font-mono text-sm text-fg">
                {result.error}
              </pre>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-success">{t('resultLabel')}</p>
              <pre className="mt-1 overflow-auto rounded-lg border border-border bg-bg-muted p-3 font-mono text-sm text-fg">
                {JSON.stringify(result.result ?? result, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
