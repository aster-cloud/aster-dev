'use client';

import type { ClientDiagnostic } from '@/hooks/useClientCompile';

/**
 * 客户端编译诊断面板：列出行列 + 消息。传入 onJump 时列表项可点击跳到编辑器
 * 对应位置（当前 textarea 编辑器未接跳转，故 playground 不传，列表为只读展示）。
 * 无诊断时不渲染（保持界面干净）。error 红、warning 琥珀、info 灰。
 */
export function DiagnosticsPanel({
  diagnostics,
  onJump,
  labels,
}: {
  diagnostics: ClientDiagnostic[];
  onJump?: (line: number, col: number) => void;
  labels: { errors: string; noErrors?: string };
}) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="mt-3 rounded-xl border border-border bg-bg-muted p-3">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
        {labels.errors}
      </div>
      <ul className="space-y-1">
        {diagnostics.map((d, i) => {
          const clickable = onJump && d.startLine != null && d.startCol != null;
          const color =
            d.severity === 'error'
              ? 'text-danger'
              : d.severity === 'warning'
                ? 'text-warning-fg'
                : 'text-fg-muted';
          return (
            <li key={i}>
              <button
                type="button"
                disabled={!clickable}
                onClick={() =>
                  clickable && onJump!(d.startLine!, d.startCol!)
                }
                className={`block w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                  clickable ? 'hover:bg-bg-subtle' : 'cursor-default'
                } ${color}`}
              >
                {d.startLine != null && (
                  <span className="mr-2 font-mono opacity-70">
                    L{d.startLine}:{d.startCol}
                  </span>
                )}
                <span>{d.message}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
