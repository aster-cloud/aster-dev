'use client';

import { useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { useTranslations } from 'next-intl';

/**
 * AsterPlayground — VitePress AsterPlayground.vue（1074 行）的 React PoC 移植
 * （ADR 0018 Phase 3 第一里程碑）。
 *
 * 这是**概念验证**，证明 Vue→React + CodeMirror + 后端 evaluate 路径在新栈可行；
 * 不是 Vue 版全功能（语法高亮扩展、多示例、trace 面板、AI 解释等后续里程碑补）。
 *
 * 编译/执行仍走后端 /api/v1/policies/evaluate-source（与原站同一真实路径），
 * 不在前端做语义——保持"可信执行链"。文案走 next-intl（playground namespace），
 * 运行时从后端 messages 加载。
 */

const API_BASE =
  process.env.NEXT_PUBLIC_ASTER_POLICY_API_URL || 'https://policy.aster-lang.dev';

const SAMPLE = `Module Greeting.

Rule greet given name:
  return "Hello, " followed by name.`;

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
    <section>
      <h1>{t('title')}</h1>
      <p style={{ color: '#475569' }}>{t('subtitle')}</p>

      <label style={{ fontWeight: 600 }}>{t('sourceLabel')}</label>
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', marginTop: 8 }}>
        <CodeMirror value={source} height="200px" onChange={setSource} />
      </div>

      <button
        onClick={run}
        disabled={running}
        style={{
          marginTop: 12,
          background: running ? '#94a3b8' : '#2563eb',
          color: '#fff',
          border: 'none',
          padding: '0.6rem 1.25rem',
          borderRadius: 8,
          cursor: running ? 'default' : 'pointer',
        }}
      >
        {running ? t('running') : t('run')}
      </button>

      {result && (
        <div style={{ marginTop: 16 }}>
          {result.error !== undefined ? (
            <>
              <strong style={{ color: '#dc2626' }}>{t('errorLabel')}</strong>
              <pre style={pre}>{result.error}</pre>
            </>
          ) : (
            <>
              <strong>{t('resultLabel')}</strong>
              <pre style={pre}>{JSON.stringify(result.result ?? result, null, 2)}</pre>
            </>
          )}
        </div>
      )}
    </section>
  );
}

const pre: React.CSSProperties = {
  background: '#f8fafc',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '0.75rem',
  overflow: 'auto',
};
