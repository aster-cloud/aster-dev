'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { buildChain, type EvidenceBlock } from './evidence';
import { createEngine, type Decision, type GuardEngine } from './engine';
import { guardianReducer, initialState } from './machine';
import { APPROVER, GUARD_SOURCE, toGuardRequest, type Principal, type ToolCall } from './scenario';

/**
 * 演示的 React 外壳：持有引擎与状态机，按秒推进过期，异步计算证据哈希链。
 * `now` 是与状态机共用的时钟：每秒滴答，且每次派发动作时同步刷新，倒计时据此显示。
 * 审批动作恒以 APPROVER（Dana）身份发出——请求方一侧没有审批入口。
 */
export function useGuardian(opts: { now?: () => number } = {}) {
  const now = opts.now ?? Date.now;
  const [state, dispatch] = useReducer(guardianReducer, initialState);
  const [engine, setEngine] = useState<GuardEngine>(() => createEngine(GUARD_SOURCE));
  const [clock, setClock] = useState(() => now());
  const [chain, setChain] = useState<EvidenceBlock[]>([]);

  useEffect(() => {
    const id = setInterval(() => {
      const at = now();
      setClock(at);
      dispatch({ type: 'tick', at });
    }, 1000);
    return () => clearInterval(id);
  }, [now]);

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
      const at = now();
      setClock(at);
      dispatch({ type: 'request', principal, call, decision, at });
      return decision;
    },
    [engine, now],
  );
  const approve = useCallback(
    (approvalId: string) => {
      const at = now();
      setClock(at);
      dispatch({ type: 'approve', approvalId, approver: APPROVER.id, at });
    },
    [now],
  );
  const reject = useCallback(
    (approvalId: string, comment: string) => {
      const at = now();
      setClock(at);
      dispatch({ type: 'reject', approvalId, approver: APPROVER.id, comment, at });
    },
    [now],
  );
  const expire = useCallback(
    (approvalId: string) => {
      const at = now();
      setClock(at);
      dispatch({ type: 'expire', approvalId, at });
    },
    [now],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return useMemo(
    () => ({ state, now: clock, chain, engine, setSource, request, approve, reject, expire, reset }),
    [state, clock, chain, engine, setSource, request, approve, reject, expire, reset],
  );
}
