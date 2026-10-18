import { describe, expect, it } from 'vitest';
import { pendingScriptedAnswers } from './scripted-approvals';
import type { Step, StepStatus } from './machine';
import type { ApproverScript } from './scenario';

function step(n: number, status: StepStatus, approvalId: string | null = `apr-${n}`): Step {
  return { id: `step-${n}`, approvalId, status } as Step;
}

const reject: ApproverScript = { kind: 'reject', commentKey: 'story.beat2.rejectComment' };
const approve: ApproverScript = { kind: 'approve' };

describe('pendingScriptedAnswers', () => {
  it('绑定步骤之外还有后续待审批步骤时，作答仍落在绑定的步骤上', () => {
    const steps = [step(1, 'executed', null), step(2, 'pending'), step(3, 'pending')];
    const actions = pendingScriptedAnswers(steps, { 1: 1, 2: 2 }, { 1: reject }, new Set());
    expect(actions).toEqual([{ kind: 'reject', beatIndex: 1, approvalId: 'apr-2', commentKey: 'story.beat2.rejectComment' }]);
  });

  it('绑定步骤已过期或已结束时不做任何事', () => {
    const steps = [step(1, 'expired'), step(2, 'pending')];
    expect(pendingScriptedAnswers(steps, { 0: 0 }, { 0: approve }, new Set())).toEqual([]);
  });

  it('每个作答只应用一次', () => {
    const steps = [step(1, 'pending')];
    expect(pendingScriptedAnswers(steps, { 0: 0 }, { 0: approve }, new Set([0]))).toEqual([]);
  });

  it('绑定步骤尚未出现时等待', () => {
    expect(pendingScriptedAnswers([], { 0: 0 }, { 0: approve }, new Set())).toEqual([]);
  });

  it('尚未绑定步骤的作答不会误用其他步骤', () => {
    expect(pendingScriptedAnswers([step(1, 'pending')], {}, { 0: approve }, new Set())).toEqual([]);
  });
});
