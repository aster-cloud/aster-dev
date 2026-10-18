'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import { useGuardian } from '../use-guardian';
import { useDirector } from '../use-director';
import { buildTimeline, storyTime, type Cue, type CueKind } from '../director';
import { APPROVER, STORY_BEATS, type ApproverScript, type StoryBeat } from '../scenario';
import { pendingScriptedAnswers } from '../scripted-approvals';
import type { Step } from '../machine';
import { CedarPanel } from '../components/cedar-panel';
import { EvidenceChain } from '../components/evidence-chain';
import { VerdictBadge } from '../components/verdict-badge';
import { BlockedNote } from '../components/tool-call-card';
import { BLOCKED_STATUSES } from '../blocked';

const BTN = 'rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50';
const CELL = 'flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-border bg-muted p-2 text-xs';
const FADE = 'transition-[opacity,transform] duration-300 motion-reduce:transition-none';

/** 某一拍中哪些提示已经派发：泳道的每一格都由它决定是否出现。 */
type Fired = (kind: CueKind, beatIndex: number) => boolean;

function Arrow() {
  return (
    <span aria-hidden="true" className="self-center text-fg-muted">
      →
    </span>
  );
}

function Cell({ title, show, children }: { title: string; show: boolean; children?: React.ReactNode }) {
  return (
    <div className={cn(CELL, FADE, show ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-30')}>
      <span className="font-semibold text-fg-muted">{title}</span>
      {show && children}
    </div>
  );
}

type Translate = ReturnType<typeof useTranslations>;

/** 审批角色：REQUIRE_APPROVAL 取规则指定的角色，ESCALATE 为任一审批人，无审批为 null。 */
function approvalRole(step: Step, t: Translate): string | null {
  if (step.approvalId === null) return null;
  if (step.decision.outcome === 'REQUIRE_APPROVAL') return step.requiredRole;
  return t('approver.anyApprover');
}

/** 审批格：无审批时显示「—」；有审批时显示角色、审批人与当前结果。 */
function ApprovalCell({ step, show }: { step: Step | undefined; show: boolean }) {
  const t = useTranslations('guardianDemo');
  const role = step ? approvalRole(step, t) : null;
  return (
    <Cell title={t('story.approval')} show={show}>
      {step && role ? (
        <>
          <span className="text-fg-muted">{role}</span>
          <span className="font-semibold">{APPROVER.name}</span>
          <span>{t(`status.${step.status}`)}</span>
        </>
      ) : (
        <span aria-label={t('approver.empty')}>—</span>
      )}
    </Cell>
  );
}

/**
 * 结果格文案：被拦截（拒绝 / 驳回 / 过期）时先给出代理收到的工具错误及审批人说明或过期状态；
 * 只有真正执行、批准或驳回、拒绝后代理作答时才给出剧情台词；仍待审批时如实显示状态。
 */
function OutcomeText({ beat, step }: { beat: StoryBeat; step: Step | undefined }) {
  const t = useTranslations('guardianDemo');
  if (!step) return null;
  if (step.status === 'pending') return <span>{t('status.pending')}</span>;
  const replied = step.status !== 'expired';
  return (
    <>
      {BLOCKED_STATUSES.has(step.status) && <BlockedNote step={step} />}
      {replied && <span>{t(`story.${beat.id}.agent`)}</span>}
    </>
  );
}

function Lane({ beat, beatIndex, step, fired }: { beat: StoryBeat; beatIndex: number; step: Step | undefined; fired: Fired }) {
  const t = useTranslations('guardianDemo');
  const called = fired('call', beatIndex) && step !== undefined;
  return (
    <li className={cn('flex flex-col gap-2 rounded-lg border border-border p-3', FADE)}>
      <p className="ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm">{t(beat.customerKey)}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Cell title={t('agent.assistant')} show={called}>
          {step && <code className="break-words font-mono">{t(`tools.${step.call.tool}`)}</code>}
        </Cell>
        <Arrow />
        <Cell title={t('guard.title')} show={called}>
          {step && <VerdictBadge outcome={step.decision.outcome} reasonCode={step.decision.reasonCode} />}
        </Cell>
        <Arrow />
        <ApprovalCell step={step} show={called} />
        <Arrow />
        <Cell title={t('story.outcome')} show={fired('outcome', beatIndex)}>
          <OutcomeText beat={beat} step={step} />
        </Cell>
      </div>
    </li>
  );
}

/** 审批人（Dana）独立一列：只读展示审批进展，请求方一侧没有任何批准入口。 */
function ApproverLane({ steps }: { steps: Step[] }) {
  const t = useTranslations('guardianDemo');
  const items = steps.filter((s) => s.approvalId !== null);
  return (
    <section aria-label={t('approver.title', { name: APPROVER.name })} className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <h3 className="text-sm font-semibold">{t('approver.title', { name: APPROVER.name })}</h3>
      {items.length === 0 && <p className="text-sm text-fg-muted">{t('approver.empty')}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 rounded-md border border-border bg-muted p-2 text-xs">
            <span className="font-semibold">{t(`tools.${s.call.tool}`)}</span>
            <span className="text-fg-muted">{approvalRole(s, t)}</span>
            <span>{t(`status.${s.status}`)}</span>
            {s.comment && <q className="text-fg-muted">{s.comment}</q>}
          </li>
        ))}
      </ul>
    </section>
  );
}

interface ControlsProps {
  playing: boolean;
  finished: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReplay: () => void;
}

/** 播放控制：始终可见（WCAG 2.2.2 暂停、停止、隐藏）。 */
function Controls({ playing, finished, onPlay, onPause, onStep, onReplay }: ControlsProps) {
  const t = useTranslations('guardianDemo.story');
  return (
    <div role="group" aria-label={t('controls')} className="flex flex-wrap items-center gap-2">
      <button type="button" className={BTN} disabled={finished} onClick={playing ? onPause : onPlay}>
        {playing ? t('pause') : t('play')}
      </button>
      <button type="button" className={BTN} disabled={finished} onClick={onStep}>
        {t('step')}
      </button>
      <button type="button" className={BTN} onClick={onReplay}>
        {t('replay')}
      </button>
    </div>
  );
}

/** 视图 B：约 50 秒自动播放的四拍剧情；审批由剧本以 Dana 身份发出。 */
export function PipelineView({ tryItHref }: { tryItHref: string }) {
  const t = useTranslations('guardianDemo');
  // 守卫用剧情时钟：只随播放 / 单步前进，暂停或标签页隐藏时审批不会过期。
  const storyElapsed = useRef(0);
  const storyNow = useCallback(() => storyTime(storyElapsed.current), []);
  const g = useGuardian({ now: storyNow });
  const timeline = useMemo(() => buildTimeline(STORY_BEATS), []);
  // 提示回调需要读取最新状态：call 提示派发的请求在下一次渲染才进入 state。
  const latest = useRef(g);
  useEffect(() => {
    latest.current = g;
  });

  // 每拍的请求将创建的步骤下标、剧本作答与已应用标记：审批只绑定到本拍的步骤。
  const requested = useRef(0);
  const beatStep = useRef<Record<number, number>>({});
  const answers = useRef<Record<number, ApproverScript>>({});
  const applied = useRef(new Set<number>());

  const onCue = (cue: Cue) => {
    const beatIndex = cue.beatIndex;
    if (beatIndex === null) return;
    const beat = STORY_BEATS[beatIndex];
    if (cue.kind === 'call') {
      beatStep.current[beatIndex] = requested.current++;
      latest.current.request(beat.principal, beat.call);
    }
    if (cue.kind === 'approver' && beat.approver) answers.current[beatIndex] = beat.approver;
  };

  const director = useDirector(timeline, onCue, storyElapsed);
  // 绑定步骤出现且仍待审批时，才以 Dana 身份落实该拍的剧本作答。
  const { approve, reject } = g;
  useEffect(() => {
    const actions = pendingScriptedAnswers(g.state.steps, beatStep.current, answers.current, applied.current);
    actions.forEach((a) => {
      applied.current.add(a.beatIndex);
      if (a.kind === 'approve') approve(a.approvalId);
      else reject(a.approvalId, t(a.commentKey));
    });
  }, [g.state.steps, director.cueIndex, approve, reject, t]);

  const finished = director.cueIndex >= timeline.length;
  const fired: Fired = (kind, beatIndex) =>
    timeline.slice(0, director.cueIndex).some((c) => c.kind === kind && c.beatIndex === beatIndex);
  const cedarShown = timeline.slice(0, director.cueIndex).some((c) => c.kind === 'cedar');
  const latestStep = g.state.steps.at(-1);

  const replay = () => {
    requested.current = 0;
    beatStep.current = {};
    answers.current = {};
    applied.current.clear();
    g.reset();
    director.replay();
  };

  return (
    <div className="flex flex-col gap-4">
      <Controls
        playing={director.playing}
        finished={finished}
        onPlay={director.play}
        onPause={director.pause}
        onStep={director.step}
        onReplay={replay}
      />
      <p aria-live="polite" className="sr-only">
        {latestStep &&
          `${t(`tools.${latestStep.call.tool}`)}: ${t(`verdict.${latestStep.decision.outcome}`)} — ${t(`status.${latestStep.status}`)}`}
      </p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ol className="flex min-w-0 flex-col gap-4 lg:col-span-2">
          {STORY_BEATS.map((beat, i) =>
            fired('customer', i) ? <Lane key={beat.id} beat={beat} beatIndex={i} step={g.state.steps[i]} fired={fired} /> : null,
          )}
        </ol>
        <ApproverLane steps={g.state.steps} />
      </div>
      <EvidenceChain chain={g.chain} layout="row" />
      {cedarShown && (
        <section className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm font-semibold">{t('story.cedar')}</p>
          <CedarPanel source={g.engine.source} />
          <a href={tryItHref} target="_top" className="self-start text-sm font-semibold text-primary underline">
            {t('story.tryIt')}
          </a>
        </section>
      )}
    </div>
  );
}
