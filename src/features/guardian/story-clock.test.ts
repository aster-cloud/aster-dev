import { describe, expect, it } from 'vitest';
import { buildTimeline, storyTime, STORY_EPOCH_MS } from './director';
import { createEngine } from './engine';
import { DEMO_APPROVAL_TTL_MS, guardianReducer, initialState } from './machine';
import { GUARD_SOURCE, STORY_BEATS, toGuardRequest } from './scenario';

const timeline = buildTimeline(STORY_BEATS);
const beat2Call = timeline.find((c) => c.kind === 'call' && c.beatIndex === 1)!;
const beat2 = STORY_BEATS[1];

/** 在剧情时间 atMs 发出第二拍（€12,000 退款 → ESCALATE）的请求。 */
function beat2Pending() {
  const decision = createEngine(GUARD_SOURCE).decide(toGuardRequest(beat2.principal, beat2.call));
  return guardianReducer(initialState, { type: 'request', principal: beat2.principal, call: beat2.call, decision, at: storyTime(beat2Call.atMs) });
}

describe('剧情时钟（视图 B）', () => {
  it('剧情时间 = 固定纪元 + 已播放时长', () => {
    expect(storyTime(0)).toBe(STORY_EPOCH_MS);
    expect(storyTime(1_500)).toBe(STORY_EPOCH_MS + 1_500);
  });

  it('暂停在第二拍：时钟冻结，任意多次滴答都不会让审批过期', () => {
    const frozen = storyTime(beat2Call.atMs);
    let s = beat2Pending();
    // 相当于暂停 10 分钟：每秒一次滴答，剧情时钟不动。
    for (let i = 0; i < 600; i++) s = guardianReducer(s, { type: 'tick', at: frozen });
    expect(s.steps[0].status).toBe('pending');
    const resumed = guardianReducer(s, { type: 'reject', approvalId: 'apr-1', approver: 'dana', comment: 'Invoice not delivered yet', at: frozen + 3_000 });
    expect(resumed.steps[0].status).toBe('rejected');
  });

  it('剧情时间真正超过 60 秒时才按生产语义过期', () => {
    const s = guardianReducer(beat2Pending(), { type: 'tick', at: storyTime(beat2Call.atMs + DEMO_APPROVAL_TTL_MS + 1) });
    expect(s.steps[0].status).toBe('expired');
  });
});
