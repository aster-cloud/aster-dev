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

const BTN = 'rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const CELL = 'flex min-w-0 flex-1 flex-col gap-1 rounded-md border border-border bg-muted p-2 text-xs';
const FADE = 'transition-[opacity,transform] duration-300 motion-reduce:transition-none';

/** 某一拍中哪些提示已经派发：泳道的每一格都由它决定是否出现。 */
type Fired = (kind: CueKind, beatIndex: number) => boolean;

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

/**
 * 当前一拍的泳道：客户台词 + 助手调用 / 守卫裁决 / 审批（Dana 内联）/ 结果四格。
 * 窄屏两列、≥ sm 四列，结果格在窄屏占满一行，保证 16:10 嵌入框内不需要滚动。
 */
function Lane({ beat, beatIndex, step, fired }: { beat: StoryBeat; beatIndex: number; step: Step | undefined; fired: Fired }) {
  const t = useTranslations('guardianDemo');
  const called = fired('call', beatIndex) && step !== undefined;
  return (
    <article aria-label={t('story.beat', { n: beatIndex + 1 })} className={cn('flex flex-col gap-2', FADE)}>
      <p className="ml-auto max-w-[85%] rounded-lg bg-primary/15 px-3 py-2 text-sm">{t(beat.customerKey)}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Cell title={t('agent.assistant')} show={called}>
          {step && <code className="break-words font-mono">{t(`tools.${step.call.tool}`)}</code>}
        </Cell>
        <Cell title={t('guard.title')} show={called}>
          {step && <VerdictBadge outcome={step.decision.outcome} reasonCode={step.decision.reasonCode} />}
        </Cell>
        <ApprovalCell step={step} show={called} />
        <div className="col-span-2 flex sm:col-span-1">
          <Cell title={t('story.outcome')} show={fired('outcome', beatIndex)}>
            <OutcomeText beat={beat} step={step} />
          </Cell>
        </div>
      </div>
    </article>
  );
}

const TONE: Record<Step['decision']['outcome'], string> = {
  ALLOW: 'border-success/40 bg-success/15 text-success',
  DENY: 'border-danger/40 bg-danger/15 text-danger',
  REQUIRE_APPROVAL: 'border-warning/40 bg-warning/15 text-warning',
  ESCALATE: 'border-primary/40 bg-primary/15 text-primary',
};

/** 四拍进度条：已发生的拍按裁决着色并写出裁决文字，未发生的写「未开始」；当前拍以 aria-current 与描边标出。 */
function BeatProgress({ steps, active }: { steps: Step[]; active: number }) {
  const t = useTranslations('guardianDemo');
  return (
    <ol aria-label={t('story.progress')} className="grid min-w-64 flex-1 grid-cols-4 gap-1.5 sm:max-w-lg">
      {STORY_BEATS.map((beat, i) => {
        const outcome = steps[i]?.decision.outcome;
        return (
          <li
            key={beat.id}
            aria-current={i === active ? 'step' : undefined}
            className={cn(
              // 窄屏序号与文字上下排，给裁决文字留出整格宽度，避免单词被拆开。
              'flex min-w-0 flex-col gap-x-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-tight sm:flex-row sm:items-baseline sm:py-1',
              outcome ? TONE[outcome] : 'border-border text-fg-muted',
              i === active && 'font-semibold ring-2 ring-primary',
            )}
          >
            <span className="font-mono">{i + 1}</span>
            <span className="min-w-0 hyphens-auto break-words">{outcome ? t(`verdict.${outcome}`) : t('story.upcoming')}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** 剧情结尾：同一规则的 Cedar 导出占满泳道区，代码框内部滚动；「亲手试试」放在标题行，始终可见。 */
function CedarFinale({ source, tryItHref }: { source: string; tryItHref: string }) {
  const t = useTranslations('guardianDemo.story');
  return (
    <section className="flex h-full min-h-0 flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">{t('cedar')}</p>
        <a href={tryItHref} target="_top" className="text-sm font-semibold text-primary underline">
          {t('tryIt')}
        </a>
      </div>
      <CedarPanel source={source} fill />
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

/**
 * 播放控制：始终可见（WCAG 2.2.2 暂停、停止、隐藏）。
 * 播完后「播放」「下一步」以 aria-disabled 标记且点击无效，而不是 disabled：
 * 键盘焦点停在原按钮上，不会因按钮被禁用而掉回 <body>。
 */
function Controls({ playing, finished, onPlay, onPause, onStep, onReplay }: ControlsProps) {
  const t = useTranslations('guardianDemo.story');
  const unlessFinished = (fn: () => void) => () => {
    if (!finished) fn();
  };
  return (
    <div role="group" aria-label={t('controls')} className="flex flex-wrap items-center gap-2">
      <button type="button" className={BTN} aria-disabled={finished || undefined} onClick={unlessFinished(playing ? onPause : onPlay)}>
        {playing ? t('pause') : t('play')}
      </button>
      <button type="button" className={BTN} aria-disabled={finished || undefined} onClick={unlessFinished(onStep)}>
        {t('step')}
      </button>
      <button type="button" className={BTN} onClick={onReplay}>
        {t('replay')}
      </button>
    </div>
  );
}

/**
 * 视图 B：约 50 秒自动播放的四拍剧情；审批由剧本以 Dana 身份发出。
 * 紧凑布局为 16:10 嵌入框（约 896×560）设计并填满父容器高度：控制行与进度条在上，
 * 一次只显示最新一拍的泳道（结尾由 Cedar 取代），证据链为底部一行标签；
 * 泳道区是唯一可伸缩的部分，内容超出时在区内滚动，嵌入文档本身不滚动。
 */
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
  const firedCues = timeline.slice(0, director.cueIndex);
  const fired: Fired = (kind, beatIndex) => firedCues.some((c) => c.kind === kind && c.beatIndex === beatIndex);
  const cedarShown = firedCues.some((c) => c.kind === 'cedar');
  // 当前一拍 = 最近一个已出场客户台词所属的拍；尚未开始为 -1。
  const activeBeat = firedCues.findLast((c) => c.kind === 'customer')?.beatIndex ?? -1;
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
    <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Controls
          playing={director.playing}
          finished={finished}
          onPlay={director.play}
          onPause={director.pause}
          onStep={director.step}
          onReplay={replay}
        />
        <BeatProgress steps={g.state.steps} active={cedarShown ? -1 : activeBeat} />
      </div>
      <p aria-live="polite" className="sr-only">
        {latestStep &&
          `${t(`tools.${latestStep.call.tool}`)}: ${t(`verdict.${latestStep.decision.outcome}`)} — ${t(`status.${latestStep.status}`)}`}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {cedarShown ? (
          <CedarFinale source={g.engine.source} tryItHref={tryItHref} />
        ) : (
          activeBeat >= 0 && (
            <Lane
              key={STORY_BEATS[activeBeat].id}
              beat={STORY_BEATS[activeBeat]}
              beatIndex={activeBeat}
              step={g.state.steps[activeBeat]}
              fired={fired}
            />
          )
        )}
      </div>
      {/* 视图 B 只保留上方一个播报区，证据链不再自带 aria-live。 */}
      <EvidenceChain chain={g.chain} layout="chips" announce={false} />
    </div>
  );
}
