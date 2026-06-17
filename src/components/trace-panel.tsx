'use client';

import { useTranslations } from 'next-intl';
import { ChevronRight, CheckCircle2, Circle } from 'lucide-react';

/** 决策轨迹形状（对齐后端 DecisionTrace record）。 */
export interface TraceStep {
  sequence: number;
  expression: string;
  result?: unknown;
  matched: boolean;
  children?: TraceStep[];
}
export interface DecisionTrace {
  moduleName?: string;
  functionName?: string;
  steps?: TraceStep[];
  finalResult?: unknown;
  executionTimeMs?: number;
}

/**
 * 决策轨迹面板（ADR 0018 Phase 3）—— Aster 核心卖点"可回放"的可视化。
 * 用原生 details/summary 做可展开树，零额外依赖。
 */
export function TracePanel({ trace }: { trace: DecisionTrace }) {
  const t = useTranslations('playground');

  return (
    <div className="mt-6 rounded-xl border border-border bg-bg-subtle p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold text-fg">{t('traceLabel')}</h3>
        {typeof trace.executionTimeMs === 'number' && (
          <span className="font-mono text-xs text-fg-subtle">{trace.executionTimeMs} ms</span>
        )}
      </div>
      <p className="mt-1 text-xs text-fg-muted">{t('traceHint')}</p>

      {(trace.moduleName || trace.functionName) && (
        <p className="mt-3 font-mono text-xs text-fg-subtle">
          {trace.moduleName}
          {trace.functionName ? ` › ${trace.functionName}` : ''}
        </p>
      )}

      <ol className="mt-2 space-y-1">
        {(trace.steps ?? []).map((step) => (
          <TraceNode key={step.sequence} step={step} stepLabel={t('traceStep')} matchedLabel={t('traceMatched')} />
        ))}
      </ol>

      <div className="mt-3 border-t border-border pt-3 text-sm">
        <span className="font-medium text-fg-muted">{t('traceResult')}: </span>
        <code className="rounded bg-bg-muted px-1.5 py-0.5 font-mono text-success">
          {JSON.stringify(trace.finalResult)}
        </code>
      </div>
    </div>
  );
}

function TraceNode({
  step,
  stepLabel,
  matchedLabel,
}: {
  step: TraceStep;
  stepLabel: string;
  matchedLabel: string;
}) {
  const hasChildren = step.children && step.children.length > 0;
  const Icon = step.matched ? CheckCircle2 : Circle;

  const row = (
    <span className="flex items-center gap-2 font-mono text-xs">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${step.matched ? 'text-success' : 'text-fg-subtle'}`} />
      <span className="text-fg-subtle">
        {stepLabel} {step.sequence}
      </span>
      <span className="truncate text-fg">{step.expression}</span>
      {step.matched && (
        <span className="rounded-full bg-success-subtle px-1.5 text-[10px] text-success">{matchedLabel}</span>
      )}
    </span>
  );

  if (!hasChildren) {
    return <li className="pl-1">{row}</li>;
  }

  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1">
          <ChevronRight className="h-3 w-3 text-fg-subtle transition-transform group-open:rotate-90" />
          {row}
        </summary>
        <ol className="ml-4 mt-1 space-y-1 border-l border-border pl-2">
          {step.children!.map((child) => (
            <TraceNode key={child.sequence} step={child} stepLabel={stepLabel} matchedLabel={matchedLabel} />
          ))}
        </ol>
      </details>
    </li>
  );
}
