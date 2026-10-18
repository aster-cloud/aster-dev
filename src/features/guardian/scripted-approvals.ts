import type { Step } from './machine';
import type { ApproverScript } from './scenario';

/** 剧本审批动作：批准，或带说明键的驳回；beatIndex 用于标记「已应用」。 */
export type ScriptedAction =
  | { kind: 'approve'; beatIndex: number; approvalId: string }
  | { kind: 'reject'; beatIndex: number; approvalId: string; commentKey: string };

/**
 * 计算此刻应当执行的剧本审批（纯函数）。
 *
 * 每个已记录的作答只绑定到它自己那一拍创建的步骤（beatStep：拍 → 步骤下标），
 * 而不是「当前最后一个待审批步骤」：后一拍的请求同时挂起时不会被误批。
 * 绑定步骤尚未出现则等待；已不在 pending（例如过期）则不做任何事；applied 中的拍只应用一次。
 */
export function pendingScriptedAnswers(
  steps: readonly Step[],
  beatStep: Readonly<Record<number, number>>,
  answers: Readonly<Record<number, ApproverScript>>,
  applied: ReadonlySet<number>,
): ScriptedAction[] {
  return Object.entries(answers).flatMap(([key, answer]) => {
    const beatIndex = Number(key);
    const step = steps[beatStep[beatIndex]];
    if (applied.has(beatIndex) || !step?.approvalId || step.status !== 'pending') return [];
    const { approvalId } = step;
    const action: ScriptedAction =
      answer.kind === 'approve'
        ? { kind: 'approve', beatIndex, approvalId }
        : { kind: 'reject', beatIndex, approvalId, commentKey: answer.commentKey };
    return [action];
  });
}
