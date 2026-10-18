'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import { useGuardian } from '../use-guardian';
import { SUPPORT_BOT, SUSPENDED_BOT, type ToolCall, type ToolName } from '../scenario';
import type { Step } from '../machine';
import { ApproverPanel } from '../components/approver-panel';
import { CedarPanel } from '../components/cedar-panel';
import { EvidenceChain } from '../components/evidence-chain';
import { RulePanel } from '../components/rule-panel';
import { ToolCallCard } from '../components/tool-call-card';
import { VerdictBadge } from '../components/verdict-badge';

const TOOLS: ToolName[] = ['issue_refund', 'delete_customer_record', 'lookup_order'];
const RECENT_STEPS = 6;
const MAX_REFUND = 20000;
const TABS = ['rule', 'evidence', 'cedar'] as const;
type TabKey = (typeof TABS)[number];

const BTN = 'rounded-md border border-border px-3 py-1.5 text-sm font-semibold hover:bg-muted';

type Guardian = ReturnType<typeof useGuardian>;

/** 每秒刷新的当前时间，供审批倒计时使用。 */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** 按工具名构造调用参数；退款单号随序号递增以免重复。 */
function buildCall(tool: ToolName, amount: number, seq: number): ToolCall {
  if (tool === 'issue_refund') return { tool, args: { order_id: `ORD-${1000 + seq + 1}`, amount } };
  if (tool === 'delete_customer_record') return { tool, args: { customer_id: 'cust_8812' } };
  return { tool, args: { order_id: 'ORD-1042' } };
}

/** 左栏：工具按钮、退款金额、停用开关与最近的步骤。 */
function RequesterColumn({ g }: { g: Guardian }) {
  const t = useTranslations('guardianDemo');
  const [amount, setAmount] = useState(40);
  const [suspended, setSuspended] = useState(false);
  const recent = g.state.steps.slice(-RECENT_STEPS).reverse();
  const fire = (tool: ToolName) => g.request(suspended ? SUSPENDED_BOT : SUPPORT_BOT, buildCall(tool, amount, g.state.seq));
  return (
    <section aria-label={t('sandbox.requester')} className="flex min-w-0 flex-col gap-4">
      <h2 className="text-lg font-semibold">{t('sandbox.requester')}</h2>
      <div className="flex flex-wrap gap-2">
        {TOOLS.map((tool) => (
          <button key={tool} type="button" className={BTN} onClick={() => fire(tool)}>
            {t(`tools.${tool}`)}
          </button>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        <span>{t('sandbox.amount')}</span>
        <span className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={MAX_REFUND}
            step={100}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="flex-1"
          />
          <output className="w-16 text-right font-mono">{amount}</output>
        </span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={suspended} onChange={(e) => setSuspended(e.target.checked)} />
        {t('sandbox.suspended')}
      </label>
      <ul className="flex flex-col gap-2">
        {recent.map((s) => (
          <li key={s.id}>
            <ToolCallCard step={s} variant="pipeline" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 中栏：最近一次裁决与独立的审批人面板。 */
function GuardColumn({ g, last }: { g: Guardian; last: Step | undefined }) {
  const t = useTranslations('guardianDemo');
  const now = useNow();
  return (
    <section aria-label="Aster guard" className="flex min-w-0 flex-col gap-4 lg:w-72">
      <h2 className="text-lg font-semibold">Aster guard</h2>
      {last && (
        <div className="flex flex-col gap-1">
          <VerdictBadge outcome={last.decision.outcome} reasonCode={last.decision.reasonCode} />
          {last.decision.reason && <p className="text-sm text-fg-muted">{last.decision.reason}</p>}
        </div>
      )}
      <div className="flex flex-col gap-2 rounded-lg border border-border p-4">
        <ApproverPanel steps={g.state.steps} now={now} onApprove={g.approve} onReject={g.reject} onExpire={g.expire} />
        {g.state.error === 'self_approval' && (
          <p role="alert" className="text-xs text-danger">
            {t('approver.selfApproval')}
          </p>
        )}
      </div>
    </section>
  );
}

/** 标签页内容：规则、证据链、Cedar 三选一。 */
function TabBody({ tab, g, last }: { tab: TabKey; g: Guardian; last: Step | undefined }) {
  if (tab === 'evidence') return <EvidenceChain chain={g.chain} layout="column" />;
  if (tab === 'cedar') return <CedarPanel source={g.engine.source} />;
  return (
    <RulePanel
      source={g.engine.source}
      editable
      highlightLine={last?.decision.ruleLine ?? null}
      diagnostics={g.engine.diagnostics}
      onChange={g.setSource}
    />
  );
}

/** 键盘可操作的标签页：左右方向键与 Home/End 切换并移动焦点。 */
function useTabKeys(active: TabKey, select: (k: TabKey) => void, refs: React.RefObject<Record<string, HTMLButtonElement | null>>) {
  return (e: KeyboardEvent) => {
    const i = TABS.indexOf(active);
    const next = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const key = TABS[(next + TABS.length) % TABS.length];
    select(key);
    refs.current[key]?.focus();
  };
}

/** 右栏：标签页容器。 */
function InspectorColumn({ g, last }: { g: Guardian; last: Step | undefined }) {
  const t = useTranslations('guardianDemo');
  const [tab, setTab] = useState<TabKey>('rule');
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onKeyDown = useTabKeys(tab, setTab, refs);
  const label: Record<TabKey, string> = { rule: t('rule.title'), evidence: t('evidence.title'), cedar: t('cedar.title') };
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div role="tablist" aria-label="Aster guard" className="flex gap-1 border-b border-border" onKeyDown={onKeyDown}>
        {TABS.map((k) => (
          <button
            key={k}
            ref={(el) => {
              refs.current[k] = el;
            }}
            id={`${base}-tab-${k}`}
            type="button"
            role="tab"
            aria-selected={tab === k}
            aria-controls={`${base}-panel-${k}`}
            tabIndex={tab === k ? 0 : -1}
            onClick={() => setTab(k)}
            className={cn('px-3 py-2 text-sm font-semibold', tab === k ? 'border-b-2 border-primary text-primary' : 'text-fg-muted')}
          >
            {label[k]}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel-${tab}`} aria-labelledby={`${base}-tab-${tab}`} tabIndex={0}>
        <TabBody tab={tab} g={g} last={last} />
      </div>
    </section>
  );
}

/** 视图 A：舞台沙盒——左侧发起工具调用，中间看裁决与审批，右侧查看规则、证据与 Cedar。 */
export function StageView() {
  const t = useTranslations('guardianDemo');
  const g = useGuardian();
  const last = g.state.steps.at(-1);
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <button type="button" className={BTN} onClick={g.reset}>
          {t('sandbox.reset')}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_auto_1.3fr]">
        <RequesterColumn g={g} />
        <GuardColumn g={g} last={last} />
        <InspectorColumn g={g} last={last} />
      </div>
    </div>
  );
}
