'use client';

import { useEffect, useRef, useState } from 'react';
import { highlightAster } from '@/lib/shiki/highlighter';

/**
 * Shiki 高亮的可编辑代码编辑器（ADR 0018 Phase 3）。
 *
 * 经典 "shiki + textarea" 叠层：透明 <textarea> 负责编辑/光标/选区，下方
 * shiki 渲染的高亮 HTML 负责着色，两层用同一 JetBrains Mono 字体 + 行高对齐。
 * 着色用移植自旧站的 aster-grammar（与 aster-cloud 同款 shiki 路径）。
 *
 * 比 CodeMirror+自定义语言更轻、与 cloud 着色完全一致；编辑能力对 playground
 * 的短代码片段足够（无需折叠/多光标等重特性）。
 */
export function CodeEditor({
  value,
  onChange,
  minHeight = 220,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeight?: number;
}) {
  const [html, setHtml] = useState<string>('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    highlightAster(value)
      .then((h) => {
        if (alive) setHtml(h);
      })
      .catch(() => {
        if (alive) setHtml('');
      });
    return () => {
      alive = false;
    };
  }, [value]);

  // 滚动同步：textarea 滚动时高亮层跟随。
  function syncScroll() {
    if (taRef.current && preRef.current) {
      preRef.current.scrollTop = taRef.current.scrollTop;
      preRef.current.scrollLeft = taRef.current.scrollLeft;
    }
  }

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border bg-bg-muted shadow-brand"
      style={{ minHeight }}
    >
      {/* 高亮层（shiki HTML，CSS 变量主题随 data-theme 翻转） */}
      <div
        ref={preRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-auto p-4 font-mono text-sm leading-relaxed [&_pre]:!bg-transparent [&_pre]:!m-0"
        dangerouslySetInnerHTML={{ __html: html || `<pre><code>${escapeHtml(value)}</code></pre>` }}
      />
      {/* 编辑层（透明文字，可见光标/选区） */}
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        className="relative block w-full resize-none overflow-auto bg-transparent p-4 font-mono text-sm leading-relaxed text-transparent caret-fg outline-none"
        style={{ minHeight }}
      />
    </div>
  );
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
