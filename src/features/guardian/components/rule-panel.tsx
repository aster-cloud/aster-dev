'use client';

import { useEffect, useRef, useState } from 'react';
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

/** 只读视图：逐行渲染，命中的规则行高亮。 */
function ReadOnlyRule({ source, highlightLine }: { source: string; highlightLine?: number | null }) {
  return (
    <pre className="overflow-x-auto rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed">
      {source.split('\n').map((line, i) => (
        <div key={i} className={cn('whitespace-pre', highlightLine === i + 1 && HIGHLIGHT)}>
          {line || ' '}
        </div>
      ))}
    </pre>
  );
}

/** 可编辑视图：本地文本 + 300 ms 防抖，外部 source 变化（如重置）时同步回编辑器。 */
function EditableRule({ source, label, onChange }: { source: string; label: string; onChange?: (s: string) => void }) {
  const [text, setText] = useState(source);
  const onChangeRef = useRef(onChange);
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
  return (
    <textarea
      aria-label={label}
      value={text}
      spellCheck={false}
      rows={Math.max(8, text.split('\n').length + 1)}
      onChange={(e) => setText(e.target.value)}
      className="w-full resize-y rounded-md border border-border bg-muted p-3 font-mono text-xs leading-relaxed"
    />
  );
}

function Diagnostics({ items }: { items: EngineDiagnostic[] }) {
  const t = useTranslations('guardianDemo.rule');
  if (items.length === 0) return null;
  return (
    <div role="alert" className="flex flex-col gap-1 rounded-md bg-danger/15 px-3 py-2 text-xs text-danger">
      <ul>
        {items.map((d, i) => (
          <li key={i}>{t('diagnostics', { line: d.line, message: d.message })}</li>
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
        <EditableRule source={source} label={t('title')} onChange={onChange} />
      ) : (
        <ReadOnlyRule source={source} highlightLine={highlightLine} />
      )}
      <Diagnostics items={diagnostics} />
    </section>
  );
}
