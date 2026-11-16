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
  /** lowering 诊断（E600–E606），带码与 span。 */
  loweringDiagnostics?: RawDiag[];
  /**
   * 过渡字段：lowering 诊断的英文消息，外加规范化 / 词法阶段的非诊断异常（只出现在这里）。
   * 有 loweringDiagnostics 时与之重复，只在其为空时取用。
   */
  loweringErrors?: string[];
  /** 名称解析诊断（E800–E807 / W800–W801）。含 error 时编译失败且不做类型检查，只能从这里拿到原因。 */
  resolutionDiagnostics?: RawDiag[];
  typeErrors?: RawDiag[];
}

/**
 * 聚合各错误来源 → 归一化诊断（纯函数，供 hook + 单测复用）。
 * 顺序：解析 → lowering → 名称解析 → 类型；无 severity 的按 error 处理。
 */
export function aggregateDiagnostics(
  result: CompileResultLike,
): ClientDiagnostic[] {
  const lowering: RawDiag[] = result.loweringDiagnostics?.length
    ? result.loweringDiagnostics
    : (result.loweringErrors ?? []).map((message) => ({ message }));
  return [
    ...(result.parseErrors ?? []).map((d) => normalize(d, 'error')),
    ...lowering.map((d) => normalize(d, 'error')),
    ...(result.resolutionDiagnostics ?? []).map((d) => normalize(d, 'error')),
    ...(result.typeErrors ?? []).map((d) => normalize(d, 'error')),
  ];
}

/** 把 lang-ts 各来源诊断归一为 ClientDiagnostic；lang-ts 的 span 行列本身就是 1-based，原样使用。 */
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
    startLine: s?.line,
    startCol: s?.col,
    endLine: e?.line,
    endCol: e?.col,
  };
}

/**
 * 纯客户端编译+类型检查，产出归一化诊断（行列标错）。无后端、无网络。
 *
 * 用 aster-lang-ts/browser 的 compileAndTypecheck，聚合各错误来源
 * （parseErrors / lowering / resolutionDiagnostics / typeErrors），与 aster-cloud 客户端编译
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
