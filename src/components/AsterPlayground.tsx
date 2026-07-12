'use client';

import { useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Play, Loader2, Share2, Check } from 'lucide-react';
import { CodeEditor } from './code-editor';
import { TracePanel, type DecisionTrace } from './trace-panel';
import { DiagnosticsPanel } from './diagnostics-panel';
import { templatesFor } from '@/lib/playground-templates';
import { localeNames, type Locale } from '@/i18n/config';
import { useAvailableLocales } from '@/hooks/useAvailableLocales';
import { useClientCompile } from '@/hooks/useClientCompile';

/**
 * AsterPlayground 全功能版（ADR 0018 Phase 3）。
 *
 * 功能：模板下拉（丰富样例）+ locale 源码语言切换 + shiki 高亮编辑器 +
 * 决策 trace 面板（?trace=true）+ URL 分享（base64 源码）+ 复制。
 *
 * 编译/执行走后端 /api/v1/policies/evaluate-source，不在前端做语义——保持可信
 * 执行链。源码语言 locale 映射到后端全码（en→en-US）。
 */

// 走 aster-cloud 的 playground BFF（已 allowlist aster-lang.dev origin）：它对内
// 用 HMAC 签名+限流+trial 网关代理到 aster-api 的 internal-only /evaluate-source。
// 直接打 policy.aster-lang.dev/api/v1/policies/evaluate-source 会 403（internal-only）。
const PLAYGROUND_API =
  process.env.NEXT_PUBLIC_PLAYGROUND_API_URL ||
  'https://aster-lang.cloud/api/playground/evaluate-source';

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
  executedFunction?: string;
  executionTimeMs?: number;
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

  // 后端可用语言（compiled ∩ backend）：admin 软下线某语种后，它会从 /api/v1/lexicons
  // 消失 → 源码语言下拉不再列该语种样例。fail-open：fetch 失败回退编译期全集。
  const { available } = useAvailableLocales();

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
  // 入口规则名 + 输入数据（context）。求值需要它们。
  const [entry, setEntry] = useState(tmpls[0].entry);
  const [context, setContext] = useState(tmpls[0].context);
  const [running, setRunning] = useState(false);
  const [resp, setResp] = useState<EvalResponse | null>(null);
  const [shared, setShared] = useState(false);

  // 纯客户端编译+类型检查（无后端）：编辑时即时行列诊断。有 error 时禁用运行，
  // 避免把明显不可编译的源码打到后端。防抖 300ms。
  const { diagnostics, errorCount, compiling } = useClientCompile(source, srcLocale);

  // 切换源码语言 → 载入该语言下同 id 的模板（保持选中项语义）。
  function switchSrcLocale(next: Locale) {
    setSrcLocale(next);
    const list = templatesFor(next);
    const same = list.find((x) => x.id === templateId) ?? list[0];
    setTemplateId(same.id);
    setSource(same.source);
    setEntry(same.entry);
    setContext(same.context);
    setResp(null);
  }

  // 当前源码语言若不在后端可用集（admin 下线该语种，或界面 locale 本就被禁），
  // 在 render 阶段就地纠正到首个可用语言（React 官方"render 期间调整 state"模式：
  // 用上一次见到的 available 做守卫，避免无限循环；不放 effect 故无级联渲染）。
  // fail-open：hook 在 fetch 未回/失败时返回编译期全集（含所有 locale），此时所有
  // srcLocale 都在集内 → 不纠正、下拉显示全部，后端异常宁可多显示。
  const [adjustedFor, setAdjustedFor] = useState<string>('');
  const availKey = available.join(',');
  if (available.length > 0 && !available.includes(srcLocale) && adjustedFor !== availKey) {
    setAdjustedFor(availKey);
    switchSrcLocale(available[0]);
  }

  function pickTemplate(id: string) {
    const tpl = tmpls.find((x) => x.id === id);
    if (tpl) {
      setTemplateId(id);
      setSource(tpl.source);
      setEntry(tpl.entry);
      setContext(tpl.context);
      setResp(null);
    }
  }

  async function run() {
    setRunning(true);
    setResp(null);
    // 解析 context（输入数据）。无效 JSON → 友好报错，不打后端。
    let parsedContext: unknown;
    try {
      parsedContext = JSON.parse(context);
    } catch {
      setResp({ error: 'Invalid input JSON (context)' });
      setRunning(false);
      return;
    }
    try {
      const res = await fetch(`${PLAYGROUND_API}?trace=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          source,
          functionName: entry,
          locale: LOCALE_ID[srcLocale],
          context: parsedContext,
        }),
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
            {available.map((l) => (
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

      {/* 客户端编译诊断（行列标错）——纯前端，无后端往返 */}
      <DiagnosticsPanel
        diagnostics={diagnostics}
        labels={{ errors: t('diagnosticsLabel') }}
      />

      {/* 输入数据（context）：入口规则的参数值，JSON 格式 */}
      <label className="mt-4 block text-sm font-semibold text-fg">
        {t('inputLabel')} <span className="font-mono text-xs font-normal text-fg-subtle">{entry}(…)</span>
      </label>
      <textarea
        value={context}
        onChange={(e) => setContext(e.target.value)}
        spellCheck={false}
        rows={Math.min(6, context.split('\n').length + 1)}
        className="mt-2 w-full rounded-xl border border-border bg-bg-muted p-3 font-mono text-sm text-fg outline-none focus:border-primary"
      />

      <button
        onClick={run}
        // 有编译错误时禁用运行（客户端已即时报错），避免把不可编译源码打到后端。
        // compiling 期间也禁用：防抖窗口内诊断未刷新，防用户抢在报错前点运行。
        disabled={running || compiling || errorCount > 0}
        title={errorCount > 0 ? t('fixErrorsFirst') : undefined}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg shadow-brand transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        {running ? t('running') : t('run')}
      </button>

      {resp && (
        <div className="mt-6">
          {/* 后端成功响应是 {result, error: null}——用 != null 同时排除 null/undefined，
              否则 `error: null !== undefined` 为 true 会误显 Error。 */}
          {resp.error != null ? (
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
