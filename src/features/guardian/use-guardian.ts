'use client';

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { buildChain, type EvidenceBlock } from './evidence';
import { createEngine, type Decision, type GuardEngine } from './engine';
import { guardianReducer, initialState } from './machine';
import { APPROVER, GUARD_SOURCE, toGuardRequest, type Principal, type ToolCall } from './scenario';

/**
 * 演示的 React 外壳：持有引擎与状态机，按秒推进过期，异步计算证据哈希链。
 * `now` 是与状态机共用的时钟：每秒滴答，且每次派发动作时同步刷新，倒计时据此显示。
 * 沙盒与代理视图用墙钟；剧情视图传入剧情时钟（暂停时不走）。时钟经 ref 读取，
 * 调用方传入内联函数也不会重建定时器或回调。
 * 审批动作恒以 APPROVER（Dana）身份发出——请求方一侧没有审批入口。
 */
export function useGuardian(opts: { now?: () => number } = {}) {
  const nowRef = useRef(opts.now ?? Date.now);
  useEffect(() => {
    nowRef.current = opts.now ?? Date.now;
  });
  const [state, dispatch] = useReducer(guardianReducer, initialState);
  const [engine, setEngine] = useState<GuardEngine>(() => createEngine(GUARD_SOURCE));
  const [clock, setClock] = useState(() => (opts.now ?? Date.now)());
  const [chain, setChain] = useState<EvidenceBlock[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const at = nowRef.current();
      setClock(at);
      dispatch({ type: 'tick', at });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let current = true;
    void buildChain(state.events).then((c) => {
      if (current) setChain(c);
    });
    return () => {
      current = false;
    };
  }, [state.events]);

  const setSource = useCallback((src: string) => setEngine((prev) => createEngine(src, prev)), []);
  const request = useCallback(
    (principal: Principal, call: ToolCall): Decision => {
      const decision = engine.decide(toGuardRequest(principal, call));
      const at = nowRef.current();
      setClock(at);
      dispatch({ type: 'request', principal, call, decision, at });
      return decision;
    },
    [engine],
  );
  const approve = useCallback(
    (approvalId: string) => {
      const at = nowRef.current();
      setClock(at);
      dispatch({ type: 'approve', approvalId, approver: APPROVER.id, at });
    },
    [],
  );
  const reject = useCallback(
    (approvalId: string, comment: string) => {
      const at = nowRef.current();
      setClock(at);
      dispatch({ type: 'reject', approvalId, approver: APPROVER.id, comment, at });
    },
    [],
  );
  const expire = useCallback(
    (approvalId: string) => {
      const at = nowRef.current();
      setClock(at);
      dispatch({ type: 'expire', approvalId, at });
    },
    [],
  );
  // 重置同时恢复内置规则：沙盒里编辑过的规则不随状态机一起残留。
  const reset = useCallback(() => {
    dispatch({ type: 'reset' });
    setEngine((prev) => (prev.source === GUARD_SOURCE ? prev : createEngine(GUARD_SOURCE)));
  }, []);

  return useMemo(
    () => ({ state, now: clock, chain, engine, setSource, request, approve, reject, expire, reset }),
    [state, clock, chain, engine, setSource, request, approve, reject, expire, reset],
  );
}
