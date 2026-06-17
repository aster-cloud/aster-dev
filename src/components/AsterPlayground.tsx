'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Play, Loader2, Share2, Check } from 'lucide-react';
import { CodeEditor } from './code-editor';
import { TracePanel, type DecisionTrace } from './trace-panel';
import { templatesFor } from '@/lib/playground-templates';
import { locales, localeNames, type Locale } from '@/i18n/config';

/**
 * AsterPlayground 全功能版（ADR 0018 Phase 3）。
 *
 * 功能：模板下拉（丰富样例）+ locale 源码语言切换 + shiki 高亮编辑器 +
 * 决策 trace 面板（?trace=true）+ URL 分享（base64 源码）+ 复制。
 *
 * 编译/执行走后端 /api/v1/policies/evaluate-source，不在前端做语义——保持可信
 * 执行链。源码语言 locale 映射到后端全码（en→en-US）。
 */

const API_BASE =
  process.env.NEXT_PUBLIC_ASTER_POLICY_API_URL || 'https://policy.aster-lang.dev';

const LOCALE_ID: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  de: 'de-DE',
  hi: 'hi-IN',
};

interface EvalResponse {
  result?: unknown;
  error?: string;
  trace?: DecisionTrace;
}

/** base64url 编解码源码用于 URL 分享（兼容 UTF-8 中文/天城文）。 */
function encodeSource(src: string): string {
  return btoa(unescape(encodeURIComponent(src)));
}
function decodeSource(enc: string): string | null {
  try {
    return decodeURIComponent(escape(atob(enc)));
  } catch {
    return null;
  }
}

export default function AsterPlayground() {
  const t = useTranslations('playground');
  const uiLocale = useLocale() as Locale;

  // 源码语言（默认跟随界面 locale，可独立切换）。
  const [srcLocale, setSrcLocale] = useState<Locale>(uiLocale);
  const tmpls = useMemo(() => templatesFor(srcLocale), [srcLocale]);

  const [templateId, setTemplateId] = useState(tmpls[0].id);
  // 懒初始化：若 URL 带 ?src= 则载入分享的源码（SSR 下 window 不存在 → 用模板）。
  // 放 useState 初始化器而非 effect，避免 set-state-in-effect 的级联渲染。
  const [source, setSource] = useState<string>(() => {
    if (typeof window === 'undefined') return tmpls[0].source;
    const enc = new URLSearchParams(window.location.search).get('src');
    const decoded = enc ? decodeSource(enc) : null;
    return decoded ?? tmpls[0].source;
  });
  const [running, setRunning] = useState(false);
  const [resp, setResp] = useState<EvalResponse | null>(null);
  const [shared, setShared] = useState(false);

  // 切换源码语言 → 载入该语言下同 id 的模板（保持选中项语义）。
  function switchSrcLocale(next: Locale) {
    setSrcLocale(next);
    const list = templatesFor(next);
    const same = list.find((x) => x.id === templateId) ?? list[0];
    setTemplateId(same.id);
    setSource(same.source);
    setResp(null);
  }

  function pickTemplate(id: string) {
    const tpl = tmpls.find((x) => x.id === id);
    if (tpl) {
      setTemplateId(id);
      setSource(tpl.source);
      setResp(null);
    }
  }

  async function run() {
    setRunning(true);
    setResp(null);
    try {
      const res = await fetch(`${API_BASE}/api/v1/policies/evaluate-source?trace=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ source, locale: LOCALE_ID[srcLocale] }),
      });
      const body = (await res.json()) as EvalResponse;
      setResp(res.ok ? body : { error: body.error ?? `HTTP ${res.status}` });
    } catch (e) {
      setResp({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  }

  async function share() {
    const url = `${window.location.origin}${window.location.pathname}?src=${encodeSource(source)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">{t('title')}</h1>
      <p className="mt-2 text-fg-muted">{t('subtitle')}</p>

      {/* 工具条：模板下拉 + 源码语言切换 + 分享 */}
      <div className="mt-6 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t('templateLabel')}
          <select
            value={templateId}
            onChange={(e) => pickTemplate(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg"
          >
            {tmpls.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs font-medium text-fg-muted">
          {t('langLabel')}
          <select
            value={srcLocale}
            onChange={(e) => switchSrcLocale(e.target.value as Locale)}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-fg"
          >
            {locales.map((l) => (
              <option key={l} value={l}>
                {localeNames[l]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={share}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
        >
          {shared ? <Check className="h-4 w-4 text-success" /> : <Share2 className="h-4 w-4" />}
          {shared ? t('shared') : t('share')}
        </button>
      </div>

      <label className="mt-5 block text-sm font-semibold text-fg">{t('sourceLabel')}</label>
      <div className="mt-2">
        <CodeEditor value={source} onChange={setSource} />
      </div>

      <button
        onClick={run}
        disabled={running}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-brand transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? t('running') : t('run')}
      </button>

      {resp && (
        <div className="mt-6">
          {resp.error !== undefined ? (
            <>
              <p className="text-sm font-semibold text-danger">{t('errorLabel')}</p>
              <pre className="mt-1 overflow-auto rounded-lg border border-danger-subtle bg-danger-subtle/40 p-3 font-mono text-sm text-fg">
                {resp.error}
              </pre>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-success">{t('resultLabel')}</p>
              <pre className="mt-1 overflow-auto rounded-lg border border-border bg-bg-muted p-3 font-mono text-sm text-fg">
                {JSON.stringify(resp.result ?? null, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}

      {resp?.trace && <TracePanel trace={resp.trace} />}
    </div>
  );
}
