'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

/**
 * 品牌化代码块（JetBrains Mono + token 配色 + 复制按钮）。
 *
 * 用极轻量的 token 级高亮（关键词/字符串/注释），不引入重型 highlighter ——
 * Aster CNL 关键词集稳定，正则着色足够，且零额外依赖、对 Workers 友好。
 * 后续里程碑可换成 shiki（aster-cloud 已用）做完整 TextMate 着色。
 */

const KEYWORDS = [
  'Module', 'Rule', 'given', 'has', 'return', 'if', 'then', 'else',
  'followed by', 'is at least', 'is greater than', 'is less than',
  'is equal to', 'and', 'or', 'not',
];

function highlight(line: string): string {
  // 注释整行
  const commentIdx = line.indexOf('#');
  const rawCode = commentIdx >= 0 ? line.slice(0, commentIdx) : line;
  const comment = commentIdx >= 0 ? line.slice(commentIdx) : '';

  // 先整体转义（防 XSS / < > 破坏 DOM），再注入安全的 <span> 标签。
  let code = escapeHtml(rawCode);

  // 字符串（已转义内容，引号仍是 "）
  code = code.replace(
    /"[^"]*"/g,
    (m) => `<span class="text-success">${m}</span>`,
  );

  // 关键词（最长优先）
  for (const kw of [...KEYWORDS].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\b${kw.replace(/ /g, '\\s+')}\\b`, 'g');
    code = code.replace(re, (m) => `<span class="text-primary font-medium">${m}</span>`);
  }

  return code + (comment ? `<span class="text-fg-subtle italic">${escapeHtml(comment)}</span>` : '');
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function CodeBlock({
  code,
  filename = 'greeting.aster',
}: {
  code: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-muted shadow-brand">
      <div className="flex items-center justify-between border-b border-border bg-bg-subtle px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          <span className="ml-2 font-mono text-xs text-fg-subtle">{filename}</span>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy code"
          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs text-fg-subtle transition-colors hover:text-fg"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <code>
          {code.split('\n').map((line, i) => (
            <span key={i} className="block" dangerouslySetInnerHTML={{ __html: highlight(line) || '​' }} />
          ))}
        </code>
      </pre>
    </div>
  );
}
