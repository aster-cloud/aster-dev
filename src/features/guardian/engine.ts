import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
// 相对路径：vitest 未配置 @/ 别名，纯逻辑模块一律用相对导入。
import { getLexicon } from '../../lib/aster-lexicon';
import { GUARD_ENTRY, type GuardRequest } from './scenario';

/**
 * 守卫引擎：在浏览器里用真实 aster-lang-ts 编译规则并求值，结果映射成与 aster-api 相同的裁决语义。
 *
 * - 编译失败时沿用上一个可用规则（沙盒编辑中途不打断演示），同时暴露诊断。
 * - 求值出错 → DENY evaluation_failed；返回值不是 Verdict → DENY not_a_verdict（生产 fail-closed）。
 * - 浏览器求值不返回 trace，「命中行」由裁决理由反查规则源得到。
 */
export type Outcome = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ESCALATE';
export type ReasonCode = 'evaluation_failed' | 'not_a_verdict';

export interface Decision {
  outcome: Outcome;
  reason: string | null;
  role: string | null;
  reasonCode: ReasonCode | null;
  ruleLine: number | null;
}

/** 编译诊断；降级（lowering）错误只有一条消息，消息里带位置时才有行列。 */
export interface EngineDiagnostic {
  message: string;
  line: number | null;
  col: number | null;
}

export interface GuardEngine {
  source: string;
  diagnostics: EngineDiagnostic[];
  decide(req: GuardRequest): Decision;
}

type Core = NonNullable<ReturnType<typeof compile>['core']>;
export type CompileOutput = {
  success: boolean;
  core?: Core;
  parseErrors?: { message: string; span: { start: { line: number; col: number } } }[];
  loweringErrors?: string[];
};

const MAX_STEPS = 10_000;
const OUTCOMES: Outcome[] = ['ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'ESCALATE'];

const failed = (reasonCode: ReasonCode): Decision => ({ outcome: 'DENY', reason: null, role: null, reasonCode, ruleLine: null });

export function findRuleLine(source: string, outcome: Outcome, reason: string | null): number | null {
  const lines = source.split('\n');
  const needle = reason ? `"${reason}"` : null;
  const index = needle
    ? lines.findIndex((l) => l.includes(needle))
    : outcome === 'ALLOW' ? lines.findIndex((l) => /^\s*Otherwise allow\./.test(l)) : -1;
  return index >= 0 ? index + 1 : null;
}

function toDecision(source: string, value: unknown): Decision {
  const v = value as { __type?: string; outcome?: string; reason?: string; role?: string } | null;
  if (!v || v.__type !== 'Verdict' || !OUTCOMES.includes(v.outcome as Outcome)) return failed('not_a_verdict');
  const outcome = v.outcome as Outcome;
  const reason = v.reason ?? null;
  return { outcome, reason, role: v.role ?? null, reasonCode: null, ruleLine: findRuleLine(source, outcome, reason) };
}

function decideWith(core: Core | null, source: string) {
  return (req: GuardRequest): Decision => {
    if (!core) return failed('evaluation_failed');
    const ev = evaluate(core, GUARD_ENTRY, { req }, { maxSteps: MAX_STEPS }) as { success: boolean; value?: unknown };
    return ev.success ? toDecision(source, ev.value) : failed('evaluation_failed');
  };
}

// 降级错误消息里可能出现的位置写法：「3:7」或「line 3」。
const LINE_COL = /\b(\d+):(\d+)\b/;
const LINE_ONLY = /\bline\s+(\d+)/i;

function loweringDiagnostic(message: string): EngineDiagnostic {
  const lc = LINE_COL.exec(message);
  if (lc) return { message, line: Number(lc[1]), col: Number(lc[2]) };
  const l = LINE_ONLY.exec(message);
  return { message, line: l ? Number(l[1]) : null, col: null };
}

/** 汇总解析错误与降级错误；两者都没有时才退回笼统的「compile failed」。 */
export function compileDiagnostics(out: CompileOutput): EngineDiagnostic[] {
  const parse = (out.parseErrors ?? []).map((e) => ({ message: e.message, line: e.span.start.line, col: e.span.start.col }));
  const lowering = (out.loweringErrors ?? []).map(loweringDiagnostic);
  const all = [...parse, ...lowering];
  return all.length > 0 ? all : [{ message: 'compile failed', line: null, col: null }];
}

export function createEngine(source: string, previous?: GuardEngine): GuardEngine {
  const out = compile(source, { lexicon: getLexicon('en') } as Parameters<typeof compile>[1]) as CompileOutput;
  if (out.success && out.core) {
    return { source, diagnostics: [], decide: decideWith(out.core, source) };
  }
  return { source, diagnostics: compileDiagnostics(out), decide: previous ? previous.decide : decideWith(null, source) };
}
