import { STORY_BEATS, type StoryBeat } from './scenario';

/**
 * 剧情时间线（纯函数）：把节拍展开成按时间排序的提示序列。
 *
 * 播放器按「已派发到第几个提示」推进而不是按定时器次数推进：标签页被节流后回来，
 * 会一次性补派所有到期提示，且每个提示只派发一次（不会重复追加证据）。
 */
export type CueKind = 'customer' | 'call' | 'approver' | 'outcome' | 'cedar';

export interface Cue {
  index: number;
  beatIndex: number | null;
  kind: CueKind;
  atMs: number;
}

// 每类提示与下一个提示的间隔（毫秒）。
const GAP: Record<CueKind, number> = { customer: 2_500, call: 3_000, approver: 4_000, outcome: 3_500, cedar: 6_000 };

export function buildTimeline(beats: StoryBeat[]): Cue[] {
  const kinds: { kind: CueKind; beatIndex: number | null }[] = beats.flatMap((beat, beatIndex) => [
    { kind: 'customer' as const, beatIndex },
    { kind: 'call' as const, beatIndex },
    ...(beat.approver ? [{ kind: 'approver' as const, beatIndex }] : []),
    { kind: 'outcome' as const, beatIndex },
  ]);
  kinds.push({ kind: 'cedar', beatIndex: null });
  let at = 0;
  return kinds.map(({ kind, beatIndex }, index) => {
    const cue = { index, beatIndex, kind, atMs: at };
    at += GAP[kind];
    return cue;
  });
}

// 由真实节拍计算总时长，避免与 STORY_BEATS 漂移。
const STORY_TIMELINE = buildTimeline(STORY_BEATS);
const LAST = STORY_TIMELINE[STORY_TIMELINE.length - 1];
export const STORY_DURATION_MS = LAST.atMs + GAP[LAST.kind];

/** 从 fromIndex 起连续取出所有已到期的提示；遇到第一个未到期的即停。 */
export function cuesBetween(timeline: Cue[], fromIndex: number, elapsedMs: number): Cue[] {
  const due: Cue[] = [];
  for (let i = fromIndex; i < timeline.length && timeline[i].atMs <= elapsedMs; i++) due.push(timeline[i]);
  return due;
}
