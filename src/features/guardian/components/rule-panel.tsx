'use client';

import { useEffect, useRef, useState, type UIEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { EngineDiagnostic } from '../engine';

const DEBOUNCE_MS = 300;
const HIGHLIGHT = 'bg-warning/20 outline outline-1 outline-warning';

interface RulePanelProps {
  source: string;
  editable: boolean;
  highlightLine?: number | null;
  diagnostics: EngineDiagnostic[];
  onChange?: (source: string) => void;
}

const CODE_BOX = 'font-mono text-xs leading-relaxed p-3 border';

/** 逐行渲染源码，命中的规则行加高亮。 */
function HighlightedLines({ source, highlightLine }: { source: string; highlightLine?: number | null }) {
  return source.split('\n').map((line, i) => (
    <div key={i} className={cn('whitespace-pre', highlightLine === i + 1 && HIGHLIGHT)}>
      {line || ' '}
    </div>
  ));
}

/** 只读视图：逐行渲染，命中的规则行高亮。 */
function ReadOnlyRule({ source, highlightLine }: { source: string; highlightLine?: number | null }) {
  return (
    <pre className={cn(CODE_BOX, 'overflow-x-auto rounded-md border-border bg-muted')}>
      <HighlightedLines source={source} highlightLine={highlightLine} />
    </pre>
  );
}

/** 可编辑视图：本地文本 + 300 ms 防抖，外部 source 变化（如重置）时同步回编辑器。 */
interface EditableRuleProps {
  source: string;
  label: string;
  highlightLine?: number | null;
  onChange?: (s: string) => void;
}

function EditableRule({ source, label, highlightLine, onChange }: EditableRuleProps) {
  const [text, setText] = useState(source);
  const onChangeRef = useRef(onChange);
  const backdropRef = useRef<HTMLPreElement>(null);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  // 外部 source 变化（如重置）时在渲染期同步回编辑器，避免 effect 内 setState。
  const [syncedSource, setSyncedSource] = useState(source);
  if (syncedSource !== source) {
    setSyncedSource(source);
    setText(source);
  }
  useEffect(() => {
    if (text === source) return;
    const id = setTimeout(() => onChangeRef.current?.(text), DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [text, source]);
  // 镜像背板与文本域共用同一盒模型与字体，滚动位置随文本域同步，高亮行才会对齐。
  const syncScroll = (e: UIEvent<HTMLTextAreaElement>) => {
    if (!backdropRef.current) return;
    backdropRef.current.scrollTop = e.currentTarget.scrollTop;
    backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
  };
  return (
    <div className="relative rounded-md bg-muted">
      <pre
        ref={backdropRef}
        aria-hidden
        className={cn(CODE_BOX, 'pointer-events-none absolute inset-0 overflow-hidden rounded-md border-transparent text-transparent')}
      >
        <HighlightedLines source={text} highlightLine={highlightLine} />
      </pre>
      <textarea
        aria-label={label}
        value={text}
        spellCheck={false}
        wrap="off"
        rows={Math.max(8, text.split('\n').length + 1)}
        onChange={(e) => setText(e.target.value)}
        onScroll={syncScroll}
        className={cn(CODE_BOX, 'relative block w-full resize-y overflow-auto whitespace-pre rounded-md border-border bg-transparent')}
      />
    </div>
  );
}

function Diagnostics({ items }: { items: EngineDiagnostic[] }) {
  const t = useTranslations('guardianDemo.rule');
  if (items.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md bg-danger/15 px-3 py-2 text-xs text-danger">
      <ul>
        {items.map((d, i) => (
          <li key={i}>{d.line === null ? d.message : t('diagnostics', { line: d.line, message: d.message })}</li>
        ))}
      </ul>
      <p className="text-fg-muted">{t('keepsLast')}</p>
    </div>
  );
}

/** 规则面板：展示（或编辑）Aster 规则源码，编译诊断列于下方。 */
export function RulePanel({ source, editable, highlightLine, diagnostics, onChange }: RulePanelProps) {
  const t = useTranslations('guardianDemo.rule');
  return (
    <section aria-label={t('title')} className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold">{t('title')}</h3>
      {editable ? (
        <EditableRule source={source} label={t('title')} highlightLine={highlightLine} onChange={onChange} />
      ) : (
        <ReadOnlyRule source={source} highlightLine={highlightLine} />
      )}
      {editable && highlightLine != null && (
        <p className="text-xs text-fg-muted">
          {t('matched')}: {highlightLine}
        </p>
      )}
      <Diagnostics items={diagnostics} />
    </section>
  );
}
