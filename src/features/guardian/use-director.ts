'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cuesBetween, type Cue } from './director';

/** 单帧最多累计的毫秒数。 */
const MAX_FRAME_MS = 250;

/**
 * 剧情播放器：累计「已播放时长」并按提示索引派发；暂停时不累计。
 *
 * - 派发进度保存在 ref 中，副作用不放进 state updater（StrictMode 会双调 updater，导致重复派发）。
 * - 挂载后才决定是否自动播放：服务端无法得知 prefers-reduced-motion，首屏一律暂停以免 hydration 不一致；
 *   用户偏好减少动态效果时保持暂停，只能单步。
 */
export function useDirector(timeline: Cue[], onCue: (cue: Cue) => void) {
  const [playing, setPlaying] = useState(false);
  const [cueIndex, setCueIndex] = useState(0);
  const indexRef = useRef(0);
  const elapsed = useRef(0);
  const last = useRef<number | null>(null);
  const onCueRef = useRef(onCue);

  useEffect(() => {
    onCueRef.current = onCue;
  });

  useEffect(() => {
    // 挂载后才能读取媒体查询，这是对外部环境的一次性同步。
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const fire = useCallback((due: Cue[]) => {
    if (due.length === 0) return;
    indexRef.current += due.length;
    due.forEach((c) => onCueRef.current(c));
    setCueIndex(indexRef.current);
  }, []);

  useEffect(() => {
    if (!playing) {
      last.current = null;
      return;
    }
    let raf = 0;
    const loop = (t: number) => {
      // 单帧增量设上限：标签页被挂起后回来，从暂停处继续而不是一次性补派大量提示。
      if (last.current !== null) elapsed.current += Math.min(t - last.current, MAX_FRAME_MS);
      last.current = t;
      fire(cuesBetween(timeline, indexRef.current, elapsed.current));
      if (indexRef.current >= timeline.length) {
        setPlaying(false);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, timeline, fire]);

  const step = useCallback(() => {
    setPlaying(false);
    const cue = timeline[indexRef.current];
    if (!cue) return;
    elapsed.current = cue.atMs;
    fire([cue]);
  }, [timeline, fire]);

  const replay = useCallback(() => {
    indexRef.current = 0;
    elapsed.current = 0;
    last.current = null;
    setCueIndex(0);
    setPlaying(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);

  return { playing, cueIndex, play, pause, step, replay };
}
