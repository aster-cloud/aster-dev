import { describe, expect, it } from 'vitest';
import { buildTimeline, cuesBetween, STORY_DURATION_MS } from './director';
import { STORY_BEATS } from './scenario';

const timeline = buildTimeline(STORY_BEATS);

describe('director 时间线', () => {
  it('确定性：相同输入相同输出', () => expect(buildTimeline(STORY_BEATS)).toEqual(timeline));

  it('节拍顺序：每拍 customer → call →（approver）→ outcome，最后 cedar', () => {
    const kinds = timeline.map((c) => c.kind);
    expect(kinds).toEqual([
      'customer', 'call', 'outcome',
      'customer', 'call', 'approver', 'outcome',
      'customer', 'call', 'approver', 'outcome',
      'customer', 'call', 'outcome',
      'cedar',
    ]);
  });

  it('总时长约 50 秒，时间单调递增', () => {
    expect(STORY_DURATION_MS).toBeGreaterThanOrEqual(45_000);
    expect(STORY_DURATION_MS).toBeLessThanOrEqual(55_000);
    for (let i = 1; i < timeline.length; i++) expect(timeline[i].atMs).toBeGreaterThan(timeline[i - 1].atMs);
  });

  it('以节拍索引推进：标签页被节流后一次性补派，每个提示只派发一次', () => {
    const first = cuesBetween(timeline, 0, 0);
    expect(first.map((c) => c.index)).toEqual([0]);
    const burst = cuesBetween(timeline, 1, 20_000);
    expect(burst[0].index).toBe(1);
    expect(new Set(burst.map((c) => c.index)).size).toBe(burst.length);
    const next = cuesBetween(timeline, 1 + burst.length, 20_000);
    expect(next).toEqual([]);
  });
});
