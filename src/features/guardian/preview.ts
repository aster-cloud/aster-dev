import type { Decision, GuardEngine } from './engine';
import { GUARD_SOURCE, toGuardRequest } from './scenario';
import type { Step } from './machine';

export interface DecisionPreview {
  decision: Decision;
  /** 是否为「按当前规则」的重算预览（规则被改动或结果与记录不同）。 */
  live: boolean;
}

function sameDecision(a: Decision, b: Decision): boolean {
  return a.outcome === b.outcome && a.reason === b.reason && a.reasonCode === b.reasonCode && a.ruleLine === b.ruleLine;
}

/**
 * 以当前引擎重算最近一次请求的裁决。纯函数：只读，不写状态机、不产生证据。
 * 内置规则且结果与记录一致时返回记录本身（live=false）。规则编译失败时引擎沿用上一份可用规则。
 */
export function previewDecision(engine: GuardEngine, last: Step | undefined): DecisionPreview | null {
  if (!last) return null;
  const decision = engine.decide(toGuardRequest(last.principal, last.call));
  const unchanged = engine.source === GUARD_SOURCE && sameDecision(decision, last.decision);
  return unchanged ? { decision: last.decision, live: false } : { decision, live: true };
}
