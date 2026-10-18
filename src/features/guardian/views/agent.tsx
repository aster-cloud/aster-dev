'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import { useGuardian } from '../use-guardian';
import { STORY_BEATS, type StoryBeat } from '../scenario';
import { previewDecision } from '../preview';
import type { Step } from '../machine';
import { ApproverPanel } from '../components/approver-panel';
import { CedarPanel } from '../components/cedar-panel';
import { EvidenceChain } from '../components/evidence-chain';
import { RulePanel } from '../components/rule-panel';
import { ToolCallCard, blockedReason } from '../components/tool-call-card';

/** 工具调用发出前的「检查中」停顿，模拟代理拦截一次 MCP 调用的耗时。 */
const CHECK_DELAY_MS = 300;
const GUARD_POLICY = 'guard.support/decide';
const BTN = 'rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50';

/** 一轮对话：对应的剧情节拍，以及请求落地后其步骤 id（检查中为 null）。 */
interface Turn {
  key: number;
  beat: StoryBeat;
  stepId: string | null;
}

function UserBubble({ text }: { text: string }) {
  return <p className="ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm">{text}</p>;
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  const t = useTranslations('guardianDemo.agent');
  return (
    <div className="mr-auto flex max-w-[85%] flex-col gap-1 rounded-lg bg-muted px-3 py-2 text-sm">
      <span className="text-xs font-semibold text-fg-muted">{t('assistant')}</span>
      {children}
    </div>
  );
}

/** 请求尚未发出时的卡片：只展示工具与「检查中」。 */
function CheckingCard({ beat }: { beat: StoryBeat }) {
  const t = useTranslations('guardianDemo');
  return (
    <article className="flex flex-col gap-1 rounded-md border border-border bg-muted p-3">
      <div className="text-sm font-semibold">{t(`tools.${beat.call.tool}`)}</div>
      <code className="break-all font-mono text-xs text-fg-muted">
        {beat.call.tool}({JSON.stringify(beat.call.args)})
      </code>
      <p className="text-xs text-fg-muted">{t('agent.checking', { policy: GUARD_POLICY })}</p>
    </article>
  );
}

/** 步骤结束后的助手回复：放行/批准给出成功句与工具结果，其余原因已在卡片内说明。 */
function Reply({ beat, step }: { beat: StoryBeat; step: Step }) {
  const t = useTranslations('guardianDemo');
  if (step.status === 'pending') return null;
  const ok = step.status === 'executed' || step.status === 'approved';
  return (
    <AssistantBubble>
      {ok ? (
        <>
          <span>{t(`story.${beat.id}.agent`)}</span>
          <span className="text-xs text-fg-muted">{t('agent.result')}</span>
        </>
      ) : (
        <span className="text-danger">{t('agent.blocked', { reason: blockedReason(step, t), decisionId: step.decisionId })}</span>
      )}
    </AssistantBubble>
  );
}

function TurnView({ turn, step }: { turn: Turn; step: Step | undefined }) {
  const t = useTranslations('guardianDemo');
  return (
    <li className="flex flex-col gap-2">
      <UserBubble text={t(turn.beat.customerKey)} />
      {step ? <ToolCallCard step={step} variant="agent" /> : <CheckingCard beat={turn.beat} />}
      {step && <Reply beat={turn.beat} step={step} />}
    </li>
  );
}

/** 视图 C：助手对话中的 MCP 工具调用被 aster-guard 内联拦截，右侧是审批人 Dana 的面板。 */
export function AgentView() {
  const t = useTranslations('guardianDemo');
  const g = useGuardian();
  const [turns, setTurns] = useState<Turn[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const nextKey = useRef(0);
  const latest = useRef(g);
  useEffect(() => {
    latest.current = g;
  });
  const busy = turns.some((x) => x.stepId === null);
  const preview = previewDecision(g.engine, g.state.steps.at(-1));

  useEffect(() => {
    const live = timers.current;
    return () => live.forEach(clearTimeout);
  }, []);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current.clear();
  };

  const send = (beat: StoryBeat) => {
    const key = nextKey.current++;
    setTurns((prev) => [...prev, { key, beat, stepId: null }]);
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      const cur = latest.current;
      const stepId = `step-${cur.state.seq + 1}`;
      cur.request(beat.principal, beat.call);
      setTurns((prev) => prev.map((x) => (x.key === key ? { ...x, stepId } : x)));
    }, CHECK_DELAY_MS);
    timers.current.add(timer);
  };

  const reset = () => {
    clearTimers();
    setTurns([]);
    g.reset();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section aria-label={t('agent.assistant')} className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          <div className="flex flex-wrap items-start gap-2">
            {STORY_BEATS.map((b) => (
              <button key={b.id} type="button" disabled={busy} className={BTN} onClick={() => send(b)}>
                {t(b.customerKey)}
              </button>
            ))}
            <button type="button" className={cn(BTN, 'ml-auto')} onClick={reset}>
              {t('sandbox.reset')}
            </button>
          </div>
          <ol aria-live="polite" className="flex flex-col gap-4">
            {turns.map((turn) => (
              <TurnView key={turn.key} turn={turn} step={g.state.steps.find((s) => s.id === turn.stepId)} />
            ))}
          </ol>
          <p className="text-xs text-fg-muted">{t('agent.howItWorks')}</p>
        </section>
        <aside className="flex min-w-0 flex-col gap-4">
          <div className="rounded-lg border border-border p-4">
            <ApproverPanel steps={g.state.steps} now={g.now} onApprove={g.approve} onReject={g.reject} onExpire={g.expire} />
          </div>
          <details className="rounded-lg border border-border p-3">
            <summary className="cursor-pointer text-sm font-semibold">{t('rule.title')}</summary>
            <div className="mt-3 flex flex-col gap-4">
              <RulePanel
                source={g.engine.source}
                editable={false}
                highlightLine={preview?.decision.ruleLine ?? null}
                diagnostics={g.engine.diagnostics}
              />
              <EvidenceChain chain={g.chain} layout="column" />
              <CedarPanel source={g.engine.source} />
            </div>
          </details>
        </aside>
      </div>
    </div>
  );
}
