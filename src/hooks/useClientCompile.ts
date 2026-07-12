'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { compileAndTypecheck } from '@aster-cloud/aster-lang-ts/browser';
import { getLexicon } from '../lib/aster-lexicon';
import type { Locale } from '../i18n/config';

/** 归一化后的诊断项（1-based 行列，供编辑器标错）。 */
export interface ClientDiagnostic {
  severity: 'error' | 'warning' | 'info';
  message: string;
  /** 1-based 起止行列；无位置信息（如 lowering 错误）时缺省。 */
  startLine?: number;
  startCol?: number;
  endLine?: number;
  endCol?: number;
}

export interface UseClientCompileResult {
  diagnostics: ClientDiagnostic[];
  errorCount: number;
  compiling: boolean;
}

interface Span {
  start?: { line: number; col: number };
  end?: { line: number; col: number };
}
export interface RawDiag {
  message?: string;
  severity?: string;
  span?: Span;
  line?: number;
  col?: number;
}

/** compileAndTypecheck 结果形状（只取诊断相关字段）。 */
export interface CompileResultLike {
  parseErrors?: RawDiag[];
  loweringErrors?: RawDiag[];
  typeErrors?: RawDiag[];
}

/**
 * 聚合三类错误来源 → 归一化诊断（纯函数，供 hook + 单测复用）。
 * parseErrors/loweringErrors/typeErrors 全部当 error 级（fallback），各自 span
 * 若有则 +1 归一到 1-based。
 */
export function aggregateDiagnostics(
  result: CompileResultLike,
): ClientDiagnostic[] {
  return [
    ...(result.parseErrors ?? []).map((d) => normalize(d, 'error')),
    ...(result.loweringErrors ?? []).map((d) => normalize(d, 'error')),
    ...(result.typeErrors ?? []).map((d) => normalize(d, 'error')),
  ];
}

/** 把 lang-ts 各来源诊断（span 0-based）归一到 1-based ClientDiagnostic。 */
export function normalize(
  raw: RawDiag,
  fallbackSeverity: ClientDiagnostic['severity'],
): ClientDiagnostic {
  const sev =
    raw.severity === 'error' || raw.severity === 'warning' || raw.severity === 'info'
      ? raw.severity
      : fallbackSeverity;
  const s = raw.span?.start;
  const e = raw.span?.end;
  return {
    severity: sev,
    message: raw.message ?? '语法错误',
    // lang-ts span 是 0-based，+1 归一到编辑器 1-based。
    startLine: s ? s.line + 1 : undefined,
    startCol: s ? s.col + 1 : undefined,
    endLine: e ? e.line + 1 : undefined,
    endCol: e ? e.col + 1 : undefined,
  };
}

/**
 * 纯客户端编译+类型检查，产出归一化诊断（行列标错）。无后端、无网络。
 *
 * 用 aster-lang-ts/browser 的 compileAndTypecheck，聚合三类错误来源
 * （parseErrors / loweringErrors / typeErrors），与 aster-cloud 客户端编译
 * 路径同源。防抖 300ms，避免每次按键都编译。空源码返回空诊断。
 */
export function useClientCompile(
  source: string,
  srcLocale: Locale,
  debounceMs = 300,
): UseClientCompileResult {
  const [diagnostics, setDiagnostics] = useState<ClientDiagnostic[]>([]);
  const [compiling, setCompiling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lexicon = useMemo(() => getLexicon(srcLocale), [srcLocale]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const trimmed = source.trim();

    // 所有 setState 都放进异步回调（timer / microtask），不在 effect 体内同步
    // 调用——本仓 lint 禁 set-state-in-effect（防级联渲染）。
    if (!trimmed) {
      // 空源码：下一个 microtask 清空诊断（异步，避开同步 setState 规则）。
      const t = setTimeout(() => {
        setDiagnostics([]);
        setCompiling(false);
      }, 0);
      timer.current = t;
      return () => clearTimeout(t);
    }

    // 非空：先异步标记「编译中」，再防抖编译。
    const startTimer = setTimeout(() => setCompiling(true), 0);
    timer.current = setTimeout(() => {
      try {
        const result = compileAndTypecheck(source, {
          lexicon,
        }) as CompileResultLike;
        setDiagnostics(aggregateDiagnostics(result));
      } catch (err) {
        // 编译器本身抛异常（罕见）→ 兜底成一条无位置 error，不吞。
        setDiagnostics([
          {
            severity: 'error',
            message: err instanceof Error ? err.message : '编译失败',
          },
        ]);
      } finally {
        setCompiling(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(startTimer);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [source, lexicon, debounceMs]);

  const errorCount = diagnostics.filter((d) => d.severity === 'error').length;
  return { diagnostics, errorCount, compiling };
}
