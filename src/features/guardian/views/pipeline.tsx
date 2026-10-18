'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import { useGuardian } from '../use-guardian';
import { useDirector } from '../use-director';
import { buildTimeline, type Cue, type CueKind } from '../director';
import { APPROVER, STORY_BEATS, type StoryBeat } from '../scenario';
import type { Step } from '../machine';
import { CedarPanel } from '../components/cedar-panel';
import { EvidenceChain } from '../components/evidence-chain';
import { VerdictBadge } from '../components/verdict-badge';

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

/** 审批格：无审批时显示「—」；有审批时显示审批人与当前结果。 */
function ApprovalCell({ step, show }: { step: Step | undefined; show: boolean }) {
  const t = useTranslations('guardianDemo');
  const needed = step?.approvalId != null;
  return (
    <Cell title={t('approver.role')} show={show}>
      {needed && step ? (
        <>
          <span className="font-semibold">{APPROVER.name}</span>
          <span>{t(`status.${step.status}`)}</span>
        </>
      ) : (
        <span aria-label={t('approver.empty')}>—</span>
      )}
    </Cell>
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
          {step && <code className="break-all font-mono">{t(`tools.${step.call.tool}`)}</code>}
        </Cell>
        <Arrow />
        <Cell title={t('guard.title')} show={called}>
          {step && <VerdictBadge outcome={step.decision.outcome} reasonCode={step.decision.reasonCode} />}
        </Cell>
        <Arrow />
        <ApprovalCell step={step} show={called} />
        <Arrow />
        <Cell title={t('story.outcome')} show={fired('outcome', beatIndex)}>
          <span>{t(`story.${beat.id}.agent`)}</span>
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
      <p className="text-xs text-fg-muted">{t('approver.role')}</p>
      {items.length === 0 && <p className="text-sm text-fg-muted">{t('approver.empty')}</p>}
      <ul className="flex flex-col gap-2">
        {items.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 rounded-md border border-border bg-muted p-2 text-xs">
            <span className="font-semibold">{t(`tools.${s.call.tool}`)}</span>
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
  const g = useGuardian();
  const timeline = useMemo(() => buildTimeline(STORY_BEATS), []);
  // 提示回调需要读取最新状态：call 提示派发的请求在下一次渲染才进入 state。
  const latest = useRef(g);
  useEffect(() => {
    latest.current = g;
  });

  const onCue = (cue: Cue) => {
    const g0 = latest.current;
    const beat = cue.beatIndex === null ? null : STORY_BEATS[cue.beatIndex];
    if (!beat) return;
    if (cue.kind === 'call') g0.request(beat.principal, beat.call);
    if (cue.kind === 'approver') answerApproval(beat, g0);
  };

  // 审批由剧本以 Dana 身份作答：批准，或带说明驳回。
  const answerApproval = (beat: StoryBeat, g0: typeof g) => {
    const approvalId = pendingApprovalId(g0);
    if (!approvalId || !beat.approver) return;
    if (beat.approver.kind === 'approve') g0.approve(approvalId);
    else g0.reject(approvalId, t(beat.approver.commentKey));
  };

  const director = useDirector(timeline, onCue);
  const finished = director.cueIndex >= timeline.length;
  const fired: Fired = (kind, beatIndex) =>
    timeline.slice(0, director.cueIndex).some((c) => c.kind === kind && c.beatIndex === beatIndex);
  const cedarShown = timeline.slice(0, director.cueIndex).some((c) => c.kind === 'cedar');
  const latestStep = g.state.steps.at(-1);

  const replay = () => {
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
        {latestStep && `${t(`tools.${latestStep.call.tool}`)}: ${t(`verdict.${latestStep.decision.outcome}`)}`}
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

/** 当前最后一个待审批步骤的审批 id；没有则为 null。 */
function pendingApprovalId(g: ReturnType<typeof useGuardian>): string | null {
  return g.state.steps.findLast((s) => s.status === 'pending')?.approvalId ?? null;
}
