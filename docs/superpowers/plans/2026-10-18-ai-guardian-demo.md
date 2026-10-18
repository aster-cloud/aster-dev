# AI Guardian 可视化演示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 aster-lang.dev 上实现 AI Guardian 演示（视图 A 舞台沙盒、视图 C MCP 代理对话、视图 B 流水线剧情 + 嵌入路由），并在 aster-lang.cloud 落地页与 `/demos/guardian` 以 iframe 嵌入剧情。

**Architecture:** aster-dev `src/features/guardian/` 是唯一实现：纯逻辑模块（scenario / engine / evidence / machine / director）+ 三个视图组件。裁决由 `@aster-cloud/aster-lang-ts/browser` 在浏览器内真实计算；证据哈希是 aster-api `AuditHashPayload` v2 的 TS 移植，由两仓共享的黄金向量锁定；Cedar 输出是本地 aster-api 生成的快照，由 `sourceHash` 新鲜度测试锁定。aster-cloud 只放行 CSP `frame-src` 并加入口与嵌入。

**Tech Stack:** Next.js 16 + next-intl + `@aster-cloud/ui`（aster-dev / aster-cloud），vitest（node 环境），`@aster-cloud/aster-lang-ts` 1.0.35，Java 21 + JUnit 5（aster-api），Playwright（仅 aster-cloud）。

**Spec:** `docs/superpowers/specs/2026-10-18-ai-guardian-demo-design.md`（先读 §0「实测修订」，它覆盖初稿中被推翻的假设）

## Global Constraints

- Node 24：`export PATH=/opt/homebrew/opt/node@24/bin:$PATH`；pnpm 10.28.0。
- 工作目录：aster-dev → `/Users/rpang/IdeaProjects/aster-dev-guardian`（分支 `feat/guardian-demo`，已 `pnpm install`）；aster-api → 新建 worktree `/Users/rpang/IdeaProjects/aster-api-guardian`（分支 `test/audit-hash-vectors`，基于 `origin/main`）；aster-cloud → 新建 worktree `/Users/rpang/IdeaProjects/aster-cloud-guardian`（分支 `feat/guardian-embed`，基于 `origin/main`）。绝不改动用户的 `/Users/rpang/IdeaProjects/aster-dev`、`/Users/rpang/IdeaProjects/aster-cloud` 检出（aster-dev 有用户暂存的 `test.json`）。
- 规则源唯一、英文、逐字如下（任何任务不得改动其文本，否则 Cedar 快照失效）：见 Task 3 `GUARD_SOURCE`。
- 规则模块 `guard.support`、入口 `decide`、规则 id `SUPPORT-001`、控制项 `EU_AI_ACT:ART14`。
- 工具名即 `req.action`：`issue_refund`、`delete_customer_record`、`lookup_order`；工具参数即 `req.context`。
- 演示审批过期时长 `DEMO_APPROVAL_TTL_MS = 60_000`；生产标注「24 小时」；MCP 代理默认 `--approval-timeout` 300 秒。
- 失败语义：评估出错 → `DENY` + `reasonCode: "evaluation_failed"`；非 Verdict → `DENY` + `reasonCode: "not_a_verdict"`。
- 请求方不能审批自己的请求；拒绝必须附非空说明；过期视为 `DENY`，由 `SYSTEM` 记证据。
- 证据事件：`ACTION_GUARD_DECISION`（`success` 仅 ALLOW 为 true）、`ACTION_GUARD_APPROVAL`（`success` 仅 APPROVED 为 true）；`tenantId` 恒为 `"demo"`。
- 预算：aster-dev `/demos/guardian` 新增路由代码 ≤ 35 KB gzip；规则编译 ≤ 50 ms；cloud 落地页 Lighthouse 性能分下降 ≤ 2；海报 ≤ 60 KB WebP。
- 剧情是持续动态内容：必须有可见暂停控件；`prefers-reduced-motion` 下默认暂停。
- 嵌入地址：`https://aster-lang.dev/embed/guardian/<locale>?theme=<light|dark>`；cloud 通过 `NEXT_PUBLIC_GUARDIAN_EMBED_URL`（缺省 `https://aster-lang.dev/embed/guardian`）配置。
- 代码注释与文档用简体中文描述意图；不写「修改说明」式注释；函数缩进 ≤ 3 层。
- 不新增安全控制（不加 `frame-ancestors` 限制等）；cloud CSP 只做 `frame-src` 放行（来源与嵌入 URL 同源推导）。
- 测试用 sdd-pg :55433 / sdd-redis :6380，绝不用 :55432 / :6379（本计划的 aster-dev 测试不需要数据库）。
- 提交信息用简体中文；结尾 trailer 恰为 `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`；提交内容中不出现任何模型标识。
- 不推送、不开 PR（由用户决定）；不提交 `AGENTS.md` / `CLAUDE.md` / `.env*` / `.superpowers/`。
- 超过 30 秒的命令一律后台运行写日志后轮询：`(CMD > /tmp/G-<name>.log 2>&1; echo EXIT=$? >> /tmp/G-<name>.log) &`。

## Review Focus

1. 用户在沙盒里把规则改坏（语法错误）——演示应继续用上一个可用规则运行并显示带行号的诊断，而不是白屏或抛错。→ Task 3 `createEngine` 测试「编译失败保留上一个可用规则」。
2. 审批人在同一待审批项上连续点击两次「批准」，或在已过期后点击——第二次操作应为无效操作，不追加第二个证据块。→ Task 5 测试「重复 / 过期后的审批为无操作」。
3. 用户把退款金额滑块拖到恰好 10000——应为 ESCALATE（`at least` 含等号），9999 为 ALLOW。→ Task 3 边界测试。
4. 剧情播放中切换浏览器标签页再切回（定时器被节流）——剧情应从当前节拍继续，不应跳拍或重复追加证据。→ Task 6 测试「director 以节拍索引推进，同一节拍只派发一次」。
5. 规则被编辑后与 Cedar 快照不一致——Cedar 面板必须标注「此为内置规则的导出结果」，而不是展示与当前规则不符的 Cedar 却不加说明。→ Task 7 `isBuiltInSource` 测试。

---

## File Structure

aster-api（worktree `aster-api-guardian`）：
- Create: `src/test/java/io/aster/audit/chain/AuditHashPayloadVectorsTest.java` — 4 个黄金向量。

aster-dev（worktree `aster-dev-guardian`），`src/features/guardian/`：
- `evidence.ts` / `evidence.test.ts` — canonicalV2 + SHA-256 + 链。
- `scenario.ts` / `scenario.test.ts` — 规则源、主体、工具调用 → 守卫请求、剧情节拍。
- `engine.ts` / `engine.test.ts` — 编译 / 决策 / 命中行。
- `snapshots/cedar.json` + `snapshots.test.ts` — Cedar 快照与新鲜度。
- `machine.ts` / `machine.test.ts` — 纯 reducer 状态机 + 证据事件。
- `director.ts` / `director.test.ts` — 剧情时间线（纯）。
- `use-guardian.ts` — React 钩子（machine + 异步哈希链 + 过期 tick）。
- `use-director.ts` — React 钩子（时间线播放 / 暂停 / 单步）。
- `components/verdict-badge.tsx`、`components/approver-panel.tsx`、`components/evidence-chain.tsx`、`components/cedar-panel.tsx`、`components/rule-panel.tsx`、`components/tool-call-card.tsx` — 共享展示件。
- `views/stage.tsx`（A）、`views/agent.tsx`（C）、`views/pipeline.tsx`（B）。
- Create: `scripts/guardian-snapshots.mjs` — 快照生成脚本（手动运行）。
- Create: `src/app/[locale]/demos/guardian/page.tsx`、`src/app/[locale]/demos/guardian/guardian-content.tsx`。
- Create: `src/app/embed/guardian/[locale]/layout.tsx`、`src/app/embed/guardian/[locale]/page.tsx`。
- Modify: `src/middleware.ts`（matcher 排除 `embed`）、`src/components/theme-provider.tsx`（透传 `forcedTheme`）、`src/app/[locale]/demos/page.tsx`（卡片）、`messages/{en,zh,de,hi}.json`（`guardianDemo` + `demosIndex.cards.guardian`）、`package.json`（`guardian:snapshots`）。

aster-cloud（worktree `aster-cloud-guardian`）：
- Modify: `src/lib/security/csp.ts`、`src/__tests__/lib/csp.test.ts`。
- Create: `src/components/marketing/guardian-embed.tsx`、`src/app/[locale]/demos/guardian/page.tsx`、`public/images/guardian-poster.webp`、`src/__tests__/e2e-browser/guardian-demo.spec.ts`、`src/__tests__/components/guardian-embed-url.test.ts`。
- Modify: `src/app/[locale]/page.tsx`（落地区块）、`src/app/[locale]/demos/page.tsx`（卡片）、`src/i18n/demo-supplement.ts`（4 语言）、`config/routes.yaml`。

---

### Task 1: aster-api 审计哈希黄金向量

**Files:**
- Create: `src/test/java/io/aster/audit/chain/AuditHashPayloadVectorsTest.java`

**Interfaces:**
- Consumes: `AuditHashPayload.digest(AuditLog, Short)`、`AuditHashPayload.CURRENT_VERSION`（`V2_FULL_CANONICAL`）、`io.aster.policy.entity.AuditLog` 公共字段。
- Produces: 4 个十六进制黄金值，Task 2 的 TS 测试逐字使用：
  - V1 `52072f98c77244cca47abd2eea21dee4d2354a9eb9636884a2e6ad9789fac724`
  - V2 `98536dd23f36d57b63547be50dd70c9e617152491d0bd8d7fa6dce85e3bbd239`
  - V3 `882fcb4d75425715649efe36df3aaa660c416a0489614f42b3c6918b55b91c54`
  - V4 `6131ac2cfef032dd5fe783d140bd47f061fde3f5568c98785f05331dd12ef8e3`

- [ ] **Step 1: 建 worktree**

```bash
cd /Users/rpang/IdeaProjects/aster-api && git fetch origin main && git worktree add -b test/audit-hash-vectors /Users/rpang/IdeaProjects/aster-api-guardian origin/main
```

- [ ] **Step 2: 写测试**

```java
package io.aster.audit.chain;

import io.aster.policy.entity.AuditLog;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/**
 * 审计哈希 V2 黄金向量。
 *
 * <p>aster-lang.dev 的 AI Guardian 演示在浏览器里用 TS 复刻了 {@link AuditHashPayload} 的 V2 公式，
 * 同一组向量写在 aster-dev 的 {@code src/features/guardian/evidence.test.ts}。任何一侧改变公式，
 * 各自的测试都会失败——这是两份实现保持逐字节一致的唯一锚点。
 *
 * <p>覆盖：创世块（prevHash 为 null）、链式块、非 ASCII 与 BMP 外字符（长度按 UTF-16 码元计）、
 * null 与空串必须得到不同摘要。
 */
class AuditHashPayloadVectorsTest {

    static final String V1 = "52072f98c77244cca47abd2eea21dee4d2354a9eb9636884a2e6ad9789fac724";
    static final String V2 = "98536dd23f36d57b63547be50dd70c9e617152491d0bd8d7fa6dce85e3bbd239";
    static final String V3 = "882fcb4d75425715649efe36df3aaa660c416a0489614f42b3c6918b55b91c54";
    static final String V4 = "6131ac2cfef032dd5fe783d140bd47f061fde3f5568c98785f05331dd12ef8e3";

    private static AuditLog decision(String prevHash, String ts, boolean success, String metadata) {
        AuditLog log = new AuditLog();
        log.prevHash = prevHash;
        log.eventType = "ACTION_GUARD_DECISION";
        log.timestamp = Instant.parse(ts);
        log.tenantId = "demo";
        log.performedBy = "support-bot";
        log.policyModule = "guard.support";
        log.policyFunction = "decide";
        log.toVersion = 1L;
        log.success = success;
        log.metadata = metadata;
        return log;
    }

    private static AuditLog v1() {
        return decision(null, "2026-10-18T09:00:00Z", true,
            "{\"outcome\":\"ALLOW\",\"ruleId\":\"SUPPORT-001\",\"actionName\":\"issue_refund\"}");
    }

    private static AuditLog v2() {
        return decision(V1, "2026-10-18T09:00:05Z", false,
            "{\"outcome\":\"REQUIRE_APPROVAL\",\"ruleId\":\"SUPPORT-001\",\"actionName\":\"delete_customer_record\"}");
    }

    private static AuditLog v3() {
        AuditLog log = new AuditLog();
        log.prevHash = V2;
        log.eventType = "ACTION_GUARD_APPROVAL";
        log.timestamp = Instant.parse("2026-10-18T09:01:00Z");
        log.tenantId = "demo";
        log.performedBy = "dana";
        log.success = Boolean.TRUE;
        log.reason = "数据保护官已批准 — Löschung ✓ 🛡";
        log.metadata = "{\"outcome\":\"APPROVED\",\"requiredRole\":\"Data Protection Officer\"}";
        return log;
    }

    private static String digest(AuditLog log) {
        return AuditHashPayload.digest(log, AuditHashPayload.CURRENT_VERSION);
    }

    @Test
    void genesisDecision() {
        assertEquals(V1, digest(v1()));
    }

    @Test
    void chainedDecision() {
        assertEquals(V2, digest(v2()));
    }

    @Test
    void nonAsciiReasonUsesUtf16Length() {
        assertEquals(24, v3().reason.length());
        assertEquals(V3, digest(v3()));
    }

    @Test
    void emptyReasonDiffersFromNull() {
        AuditLog withEmpty = v1();
        withEmpty.reason = "";
        assertEquals(V4, digest(withEmpty));
        assertNotEquals(V1, V4);
    }
}
```

- [ ] **Step 3: 运行（后台 + 日志）**

Run: `cd /Users/rpang/IdeaProjects/aster-api-guardian && (./gradlew test --tests 'io.aster.audit.chain.AuditHashPayloadVectorsTest' > /tmp/G-t1.log 2>&1; echo EXIT=$? >> /tmp/G-t1.log) &` 然后轮询 `grep -q '^EXIT=' /tmp/G-t1.log`。
Expected: `EXIT=0`，4 个测试通过（在 `build/test-results/test/TEST-io.aster.audit.chain.AuditHashPayloadVectorsTest.xml` 中核对 `tests="4" failures="0"`）。若任一断言失败：**停止并报告 BLOCKED**，附 Java 实际值——不要改 TS 侧的值去迁就，也不要改公式。

- [ ] **Step 4: 提交**

```bash
git add src/test/java/io/aster/audit/chain/AuditHashPayloadVectorsTest.java
git commit -m "$(cat <<'EOF'
test(audit): 钉住审计哈希 V2 黄金向量

aster-lang.dev 的 AI Guardian 演示以同一组向量校验其 TS 移植，任一侧漂移即失败。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 证据哈希（aster-dev `evidence.ts`）

**Files:**
- Create: `src/features/guardian/evidence.ts`
- Test: `src/features/guardian/evidence.test.ts`

**Interfaces:**
- Produces:
  - `type AuditValue = string | number | boolean | null | undefined`
  - `interface AuditFields { prevHash?; eventType; timestamp; tenantId?; performedBy?; policyModule?; policyFunction?; policyId?; fromVersion?; toVersion?; executionTimeMs?; success?; reason?; errorMessage?; notes?; metadata?; clientIp?; userAgent? }`（除 `eventType: string`、`timestamp: string` 外均为 `AuditValue`）
  - `canonicalV2(f: AuditFields): string`
  - `sha256Hex(text: string): Promise<string>`
  - `interface EvidenceBlock { index: number; fields: AuditFields; prevHash: string | null; hash: string }`
  - `buildChain(events: Omit<AuditFields, 'prevHash'>[]): Promise<EvidenceBlock[]>`
  - `javaInstant(ms: number): string` — 整秒、Java `Instant.toString()` 格式。

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { buildChain, canonicalV2, javaInstant, sha256Hex, type AuditFields } from './evidence';

// 与 aster-api AuditHashPayloadVectorsTest 逐字相同的黄金向量。
const V1 = '52072f98c77244cca47abd2eea21dee4d2354a9eb9636884a2e6ad9789fac724';
const V2 = '98536dd23f36d57b63547be50dd70c9e617152491d0bd8d7fa6dce85e3bbd239';
const V3 = '882fcb4d75425715649efe36df3aaa660c416a0489614f42b3c6918b55b91c54';
const V4 = '6131ac2cfef032dd5fe783d140bd47f061fde3f5568c98785f05331dd12ef8e3';

const decision = (prevHash: string | null, timestamp: string, success: boolean, metadata: string): AuditFields => ({
  prevHash, eventType: 'ACTION_GUARD_DECISION', timestamp, tenantId: 'demo', performedBy: 'support-bot',
  policyModule: 'guard.support', policyFunction: 'decide', toVersion: 1, success, metadata,
});
const v1 = decision(null, '2026-10-18T09:00:00Z', true, '{"outcome":"ALLOW","ruleId":"SUPPORT-001","actionName":"issue_refund"}');
const v2 = decision(V1, '2026-10-18T09:00:05Z', false, '{"outcome":"REQUIRE_APPROVAL","ruleId":"SUPPORT-001","actionName":"delete_customer_record"}');
const v3: AuditFields = {
  prevHash: V2, eventType: 'ACTION_GUARD_APPROVAL', timestamp: '2026-10-18T09:01:00Z', tenantId: 'demo',
  performedBy: 'dana', success: true, reason: '数据保护官已批准 — Löschung ✓ 🛡',
  metadata: '{"outcome":"APPROVED","requiredRole":"Data Protection Officer"}',
};

describe('canonicalV2 / sha256Hex 与 aster-api 黄金向量一致', () => {
  it('V1 创世块', async () => expect(await sha256Hex(canonicalV2(v1))).toBe(V1));
  it('V2 链式块', async () => expect(await sha256Hex(canonicalV2(v2))).toBe(V2));
  it('V3 非 ASCII：长度按 UTF-16 码元', async () => {
    expect(v3.reason).toHaveLength(24);
    expect(await sha256Hex(canonicalV2(v3))).toBe(V3);
  });
  it('V4 空串与 null 不同', async () => {
    expect(await sha256Hex(canonicalV2({ ...v1, reason: '' }))).toBe(V4);
  });
  it('null 编码为 -1，空串编码为 0:', () => {
    const c = canonicalV2({ ...v1, reason: '' });
    expect(c.startsWith('v2\nprevHash:-1\n')).toBe(true);
    expect(c).toContain('\nreason:0:\n');
  });
});

describe('buildChain', () => {
  it('前两块复现 V1 → V2，且每块 prevHash 指向上一块', async () => {
    const strip = ({ prevHash: _p, ...rest }: AuditFields) => rest;
    const chain = await buildChain([strip(v1), strip(v2), strip(v1), strip(v2), strip(v1), strip(v2)]);
    expect(chain.map((b) => b.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chain[0].prevHash).toBeNull();
    expect(chain[0].hash).toBe(V1);
    expect(chain[1].hash).toBe(V2);
    for (let i = 1; i < chain.length; i++) expect(chain[i].prevHash).toBe(chain[i - 1].hash);
  });
});

describe('javaInstant', () => {
  it('整秒且无毫秒，与 Java Instant.toString 一致', () => {
    expect(javaInstant(Date.UTC(2026, 9, 18, 9, 0, 0, 999))).toBe('2026-10-18T09:00:00Z');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm exec vitest run src/features/guardian/evidence.test.ts`
Expected: FAIL（`Cannot find module './evidence'`）。

- [ ] **Step 3: 实现**

```ts
/**
 * 审计证据链：aster-api `AuditHashPayload.canonicalV2` 的逐字节移植。
 *
 * 字段顺序是协议的一部分，不得调整。长度按 UTF-16 码元计算（与 Java `String.length()` 一致），
 * 摘要对 UTF-8 字节做 SHA-256。黄金向量与 aster-api `AuditHashPayloadVectorsTest` 共享。
 */
export type AuditValue = string | number | boolean | null | undefined;

export interface AuditFields {
  prevHash?: AuditValue;
  eventType: string;
  timestamp: string;
  tenantId?: AuditValue;
  performedBy?: AuditValue;
  policyModule?: AuditValue;
  policyFunction?: AuditValue;
  policyId?: AuditValue;
  fromVersion?: AuditValue;
  toVersion?: AuditValue;
  executionTimeMs?: AuditValue;
  success?: AuditValue;
  reason?: AuditValue;
  errorMessage?: AuditValue;
  notes?: AuditValue;
  metadata?: AuditValue;
  clientIp?: AuditValue;
  userAgent?: AuditValue;
}

const FIELD_ORDER: (keyof AuditFields)[] = [
  'prevHash', 'eventType', 'timestamp', 'tenantId', 'performedBy', 'policyModule', 'policyFunction',
  'policyId', 'fromVersion', 'toVersion', 'executionTimeMs', 'success', 'reason', 'errorMessage',
  'notes', 'metadata', 'clientIp', 'userAgent',
];

export function canonicalV2(f: AuditFields): string {
  let c = 'v2\n';
  for (const name of FIELD_ORDER) {
    const v = f[name];
    // null 与空串必须可区分：前者 -1，后者 0。
    c += v === null || v === undefined ? `${name}:-1\n` : `${name}:${String(v).length}:${String(v)}\n`;
  }
  return c;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EvidenceBlock {
  index: number;
  fields: AuditFields;
  prevHash: string | null;
  hash: string;
}

export async function buildChain(events: Omit<AuditFields, 'prevHash'>[]): Promise<EvidenceBlock[]> {
  const chain: EvidenceBlock[] = [];
  let prevHash: string | null = null;
  for (const event of events) {
    const fields: AuditFields = { ...event, prevHash };
    const hash = await sha256Hex(canonicalV2(fields));
    chain.push({ index: chain.length + 1, fields, prevHash, hash });
    prevHash = hash;
  }
  return chain;
}

/** 整秒的 Java `Instant.toString()`：演示时间戳一律截到秒，避免毫秒格式差异。 */
export function javaInstant(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm exec vitest run src/features/guardian/evidence.test.ts`
Expected: PASS（8 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/features/guardian/evidence.ts src/features/guardian/evidence.test.ts
git commit -m "$(cat <<'EOF'
feat(guardian): 审计证据链的 V2 哈希移植

与 aster-api AuditHashPayload 逐字节一致，由共享黄金向量锁定。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 场景与引擎（`scenario.ts`、`engine.ts`）

**Files:**
- Create: `src/features/guardian/scenario.ts`、`src/features/guardian/engine.ts`
- Test: `src/features/guardian/scenario.test.ts`、`src/features/guardian/engine.test.ts`

**Interfaces:**
- Produces（scenario.ts）：
  - `GUARD_SOURCE: string`、`GUARD_MODULE = 'guard.support'`、`GUARD_ENTRY = 'decide'`、`RULE_ID = 'SUPPORT-001'`
  - `type ToolName = 'issue_refund' | 'delete_customer_record' | 'lookup_order'`
  - `interface ToolCall { tool: ToolName; args: Record<string, string | number> }`
  - `interface Principal { id: string; roles: string[] }`；`SUPPORT_BOT`、`SUSPENDED_BOT`
  - `interface GuardRequest { principal_id; principal_type; principal_roles; action; resource_type; resource_id; context; agent_model }`
  - `toGuardRequest(principal: Principal, call: ToolCall): GuardRequest`
  - `type ApproverScript = { kind: 'approve' } | { kind: 'reject'; commentKey: string }`
  - `interface StoryBeat { id: string; customerKey: string; principal: Principal; call: ToolCall; approver?: ApproverScript }`
  - `STORY_BEATS: StoryBeat[]`（4 个）
  - `APPROVER = { id: 'dana', name: 'Dana' }`
- Produces（engine.ts）：
  - `type Outcome = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ESCALATE'`
  - `type ReasonCode = 'evaluation_failed' | 'not_a_verdict'`
  - `interface Decision { outcome: Outcome; reason: string | null; role: string | null; reasonCode: ReasonCode | null; ruleLine: number | null }`
  - `interface EngineDiagnostic { message: string; line: number; col: number }`
  - `interface GuardEngine { source: string; diagnostics: EngineDiagnostic[]; decide(req: GuardRequest): Decision }`
  - `createEngine(source: string, previous?: GuardEngine): GuardEngine`
  - `findRuleLine(source: string, outcome: Outcome, reason: string | null): number | null`

- [ ] **Step 1: 写失败测试（scenario）**

```ts
import { describe, expect, it } from 'vitest';
import { GUARD_SOURCE, STORY_BEATS, SUPPORT_BOT, SUSPENDED_BOT, toGuardRequest } from './scenario';

describe('scenario', () => {
  it('规则源声明标准守卫请求形状（Cedar 导出的前提）', () => {
    expect(GUARD_SOURCE).toContain(
      'Define GuardRequest has principal_id, principal_type, principal_roles, action, resource_type, resource_id, context, agent_model.',
    );
    expect(GUARD_SOURCE).toContain('@id("SUPPORT-001")');
  });

  it('工具名 → action，参数 → context（与 aster-guard MCP 代理一致），null 参数被去掉', () => {
    const req = toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-1042', amount: 40 } });
    expect(req).toEqual({
      principal_id: 'support-bot', principal_type: 'agent', principal_roles: [], action: 'issue_refund',
      resource_type: 'order', resource_id: 'ORD-1042', context: { order_id: 'ORD-1042', amount: 40 }, agent_model: 'support-agent',
    });
  });

  it('剧情四拍：ALLOW / ESCALATE+拒绝 / REQUIRE_APPROVAL+批准 / 暂停主体', () => {
    expect(STORY_BEATS.map((b) => b.call.tool)).toEqual(['issue_refund', 'issue_refund', 'delete_customer_record', 'issue_refund']);
    expect(STORY_BEATS[1].approver).toEqual({ kind: 'reject', commentKey: 'story.beat2.rejectComment' });
    expect(STORY_BEATS[2].approver).toEqual({ kind: 'approve' });
    expect(STORY_BEATS[3].principal).toBe(SUSPENDED_BOT);
  });
});
```

- [ ] **Step 2: 写失败测试（engine）**

```ts
import { describe, expect, it } from 'vitest';
import { createEngine, findRuleLine } from './engine';
import { GUARD_SOURCE, SUPPORT_BOT, SUSPENDED_BOT, toGuardRequest } from './scenario';

const engine = createEngine(GUARD_SOURCE);
const refund = (amount: number, bot = SUPPORT_BOT) =>
  engine.decide(toGuardRequest(bot, { tool: 'issue_refund', args: { order_id: 'ORD-1', amount } }));

describe('engine.decide（真实 aster-lang-ts 浏览器引擎）', () => {
  it('编译无诊断', () => expect(engine.diagnostics).toEqual([]));

  it('小额退款 → ALLOW，命中 Otherwise 行', () => {
    const d = refund(40);
    expect(d).toMatchObject({ outcome: 'ALLOW', reason: null, reasonCode: null });
    expect(GUARD_SOURCE.split('\n')[d.ruleLine! - 1]).toContain('Otherwise allow.');
  });

  it('金额边界：9999 ALLOW，10000 ESCALATE（at least 含等号）', () => {
    expect(refund(9999).outcome).toBe('ALLOW');
    expect(refund(10000)).toMatchObject({ outcome: 'ESCALATE', reason: 'large refund', role: null });
  });

  it('删除客户记录（context 无 amount）→ REQUIRE_APPROVAL by DPO', () => {
    const d = engine.decide(toGuardRequest(SUPPORT_BOT, { tool: 'delete_customer_record', args: { customer_id: 'cust_8812' } }));
    expect(d).toMatchObject({ outcome: 'REQUIRE_APPROVAL', role: 'Data Protection Officer', reason: 'customer record deletion' });
    expect(GUARD_SOURCE.split('\n')[d.ruleLine! - 1]).toContain('"customer record deletion"');
  });

  it('暂停主体 → DENY，无论动作', () => {
    expect(refund(10, SUSPENDED_BOT)).toMatchObject({ outcome: 'DENY', reason: 'suspended principal' });
    const del = engine.decide(toGuardRequest(SUSPENDED_BOT, { tool: 'delete_customer_record', args: { customer_id: 'c' } }));
    expect(del.outcome).toBe('DENY');
  });

  it('退款缺少 amount → 评估出错 → DENY evaluation_failed（与生产 fail-closed 一致）', () => {
    const d = engine.decide(toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'ORD-1' } }));
    expect(d).toMatchObject({ outcome: 'DENY', reasonCode: 'evaluation_failed', ruleLine: null });
  });
});

describe('createEngine 容错', () => {
  it('编译失败时保留上一个可用规则，并给出带行号的诊断', () => {
    const broken = createEngine(GUARD_SOURCE.replace('Otherwise allow.', 'Otherwise allw.'), engine);
    expect(broken.diagnostics.length).toBeGreaterThan(0);
    expect(broken.diagnostics[0].line).toBeGreaterThan(0);
    expect(broken.decide(toGuardRequest(SUPPORT_BOT, { tool: 'issue_refund', args: { order_id: 'o', amount: 40 } })).outcome).toBe('ALLOW');
  });

  it('首次即编译失败且无上一个规则 → 一律 DENY evaluation_failed', () => {
    const none = createEngine('Module x.\nnot a rule');
    expect(none.diagnostics.length).toBeGreaterThan(0);
    expect(none.decide(toGuardRequest(SUPPORT_BOT, { tool: 'lookup_order', args: { order_id: 'o' } })).reasonCode).toBe('evaluation_failed');
  });
});

describe('findRuleLine', () => {
  it('找不到对应理由时返回 null（用户改写规则后不误标）', () => {
    expect(findRuleLine(GUARD_SOURCE, 'DENY', 'no such reason')).toBeNull();
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm exec vitest run src/features/guardian/scenario.test.ts src/features/guardian/engine.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 4: 实现 scenario.ts**

```ts
/**
 * AI Guardian 演示的唯一场景定义：规则源、主体、工具调用 → 守卫请求、剧情节拍。
 *
 * 规则源必须是标准守卫请求形状且保持英文（Cedar 导出按英文字段名匹配）；改动规则文本后必须
 * 重新运行 `pnpm guardian:snapshots`，否则 snapshots.test.ts 失败。
 */
export const GUARD_MODULE = 'guard.support';
export const GUARD_ENTRY = 'decide';
export const RULE_ID = 'SUPPORT-001';

export const GUARD_SOURCE = `Module guard.support.

Define GuardRequest has principal_id, principal_type, principal_roles, action, resource_type, resource_id, context, agent_model.

@id("SUPPORT-001")
@control("EU_AI_ACT:ART14")
Rule decide given req as GuardRequest, produce Verdict:
  If List.contains(req.principal_roles, "suspended"):
    Return Verdict.deny("suspended principal").
  When req.action equals to "delete_customer_record", require approval by "Data Protection Officer" because "customer record deletion".
  If req.action equals to "issue_refund" and req.context.amount at least 10000:
    Return Verdict.escalate("large refund").
  Otherwise allow.
`;

export type ToolName = 'issue_refund' | 'delete_customer_record' | 'lookup_order';

export interface ToolCall {
  tool: ToolName;
  args: Record<string, string | number>;
}

export interface Principal {
  id: string;
  roles: string[];
}

export const SUPPORT_BOT: Principal = { id: 'support-bot', roles: [] };
export const SUSPENDED_BOT: Principal = { id: 'support-bot-eu', roles: ['suspended'] };
export const APPROVER = { id: 'dana', name: 'Dana' } as const;

export interface GuardRequest {
  principal_id: string;
  principal_type: string;
  principal_roles: string[];
  action: string;
  resource_type: string;
  resource_id: string;
  context: Record<string, string | number>;
  agent_model: string;
}

// 资源取自哪个参数：对应 aster-guard 的 --resource-from。
const RESOURCE_ARG: Record<ToolName, { arg: string; type: string }> = {
  issue_refund: { arg: 'order_id', type: 'order' },
  delete_customer_record: { arg: 'customer_id', type: 'customer' },
  lookup_order: { arg: 'order_id', type: 'order' },
};

export function toGuardRequest(principal: Principal, call: ToolCall): GuardRequest {
  const context = Object.fromEntries(Object.entries(call.args).filter(([, v]) => v !== null && v !== undefined));
  const resource = RESOURCE_ARG[call.tool];
  return {
    principal_id: principal.id,
    principal_type: 'agent',
    principal_roles: principal.roles,
    action: call.tool,
    resource_type: resource.type,
    resource_id: String(call.args[resource.arg] ?? ''),
    context,
    agent_model: 'support-agent',
  };
}

export type ApproverScript = { kind: 'approve' } | { kind: 'reject'; commentKey: string };

export interface StoryBeat {
  id: string;
  /** guardianDemo 命名空间下客户台词的消息键。 */
  customerKey: string;
  principal: Principal;
  call: ToolCall;
  approver?: ApproverScript;
}

export const STORY_BEATS: StoryBeat[] = [
  { id: 'beat1', customerKey: 'story.beat1.customer', principal: SUPPORT_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'ORD-1042', amount: 40 } } },
  { id: 'beat2', customerKey: 'story.beat2.customer', principal: SUPPORT_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'INV-77', amount: 12000 } },
    approver: { kind: 'reject', commentKey: 'story.beat2.rejectComment' } },
  { id: 'beat3', customerKey: 'story.beat3.customer', principal: SUPPORT_BOT,
    call: { tool: 'delete_customer_record', args: { customer_id: 'cust_8812' } },
    approver: { kind: 'approve' } },
  { id: 'beat4', customerKey: 'story.beat4.customer', principal: SUSPENDED_BOT,
    call: { tool: 'issue_refund', args: { order_id: 'ORD-2001', amount: 10 } } },
];
```

- [ ] **Step 5: 实现 engine.ts**

```ts
import { compile, evaluate } from '@aster-cloud/aster-lang-ts/browser';
// 相对路径：vitest 未配置 @/ 别名，纯逻辑模块一律用相对导入。
import { getLexicon } from '../../lib/aster-lexicon';
import { GUARD_ENTRY, type GuardRequest } from './scenario';

/**
 * 守卫引擎：在浏览器里用真实 aster-lang-ts 编译规则并求值，结果映射成与 aster-api 相同的裁决语义。
 *
 * - 编译失败时沿用上一个可用规则（沙盒编辑中途不打断演示），同时暴露诊断。
 * - 求值出错 → DENY evaluation_failed；返回值不是 Verdict → DENY not_a_verdict（生产 fail-closed）。
 * - 浏览器求值不返回 trace，「命中行」由裁决理由反查规则源得到。
 */
export type Outcome = 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL' | 'ESCALATE';
export type ReasonCode = 'evaluation_failed' | 'not_a_verdict';

export interface Decision {
  outcome: Outcome;
  reason: string | null;
  role: string | null;
  reasonCode: ReasonCode | null;
  ruleLine: number | null;
}

export interface EngineDiagnostic {
  message: string;
  line: number;
  col: number;
}

export interface GuardEngine {
  source: string;
  diagnostics: EngineDiagnostic[];
  decide(req: GuardRequest): Decision;
}

type Core = NonNullable<ReturnType<typeof compile>['core']>;
type CompileOutput = { success: boolean; core?: Core; parseErrors?: { message: string; span: { start: { line: number; col: number } } }[] };

const MAX_STEPS = 10_000;
const OUTCOMES: Outcome[] = ['ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'ESCALATE'];

const failed = (reasonCode: ReasonCode): Decision => ({ outcome: 'DENY', reason: null, role: null, reasonCode, ruleLine: null });

export function findRuleLine(source: string, outcome: Outcome, reason: string | null): number | null {
  const lines = source.split('\n');
  const needle = reason ? `"${reason}"` : null;
  const index = needle
    ? lines.findIndex((l) => l.includes(needle))
    : outcome === 'ALLOW' ? lines.findIndex((l) => /^\s*Otherwise allow\./.test(l)) : -1;
  return index >= 0 ? index + 1 : null;
}

function toDecision(source: string, value: unknown): Decision {
  const v = value as { __type?: string; outcome?: string; reason?: string; role?: string } | null;
  if (!v || v.__type !== 'Verdict' || !OUTCOMES.includes(v.outcome as Outcome)) return failed('not_a_verdict');
  const outcome = v.outcome as Outcome;
  const reason = v.reason ?? null;
  return { outcome, reason, role: v.role ?? null, reasonCode: null, ruleLine: findRuleLine(source, outcome, reason) };
}

function decideWith(core: Core | null, source: string) {
  return (req: GuardRequest): Decision => {
    if (!core) return failed('evaluation_failed');
    const ev = evaluate(core, GUARD_ENTRY, { req }, { maxSteps: MAX_STEPS }) as { success: boolean; value?: unknown };
    return ev.success ? toDecision(source, ev.value) : failed('evaluation_failed');
  };
}

export function createEngine(source: string, previous?: GuardEngine): GuardEngine {
  const out = compile(source, { lexicon: getLexicon('en') } as Parameters<typeof compile>[1]) as CompileOutput;
  if (out.success && out.core) {
    return { source, diagnostics: [], decide: decideWith(out.core, source) };
  }
  const diagnostics = (out.parseErrors ?? [{ message: 'compile failed', span: { start: { line: 1, col: 1 } } }]).map((e) => ({
    message: e.message, line: e.span.start.line, col: e.span.start.col,
  }));
  return { source, diagnostics, decide: previous ? previous.decide : decideWith(null, source) };
}
```

- [ ] **Step 6: 运行确认通过**

Run: `pnpm exec vitest run src/features/guardian/scenario.test.ts src/features/guardian/engine.test.ts`
Expected: PASS（scenario 3、engine 9）。`src/features/guardian/` 下被测试的纯逻辑模块（evidence / scenario / engine / machine / director / cedar-source）不得使用 `@/` 别名——仓库没有 vitest 配置，别名在测试中不可解析。

- [ ] **Step 7: 提交**

```bash
git add src/features/guardian/scenario.ts src/features/guardian/scenario.test.ts src/features/guardian/engine.ts src/features/guardian/engine.test.ts
git commit -m "$(cat <<'EOF'
feat(guardian): 场景定义与浏览器内守卫引擎

guard.support 规则采用标准守卫请求形状；求值失败按生产语义 fail-closed。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cedar 快照与新鲜度检查

**Files:**
- Create: `scripts/guardian-snapshots.mjs`、`src/features/guardian/snapshots/cedar.json`（脚本生成）
- Test: `src/features/guardian/snapshots.test.ts`
- Modify: `package.json`（`scripts` 增加 `"guardian:snapshots": "node scripts/guardian-snapshots.mjs"`）

**Interfaces:**
- Consumes: `GUARD_SOURCE`、`RULE_ID`、`GUARD_MODULE`（Task 3）。
- Produces: `cedar.json` 形状 `{ sourceHash: string; ruleId: string; moduleName: string; exportable: true; probes: { count: number; agreed: number }; controls: string[]; policies: string; schemaText: string; generatedAt: string }`，Task 7 的 `CedarPanel` 读取。

- [ ] **Step 1: 写失败测试**

```ts
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import cedar from './snapshots/cedar.json';
import { GUARD_MODULE, GUARD_SOURCE, RULE_ID } from './scenario';

describe('Cedar 快照新鲜度', () => {
  it('快照对应当前规则源（规则改动后须重新生成）', () => {
    const hash = createHash('sha256').update(GUARD_SOURCE).digest('hex');
    expect(cedar.sourceHash, '规则已变更——请对本地 aster-api 运行 `pnpm guardian:snapshots`').toBe(hash);
  });

  it('快照可导出且全部探针一致', () => {
    expect(cedar.exportable).toBe(true);
    expect(cedar.probes.count).toBeGreaterThan(0);
    expect(cedar.probes.agreed).toBe(cedar.probes.count);
    expect(cedar.ruleId).toBe(RULE_ID);
    expect(cedar.moduleName).toBe(GUARD_MODULE);
    expect(cedar.policies).toContain('@aster_rule("SUPPORT-001")');
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm exec vitest run src/features/guardian/snapshots.test.ts`
Expected: FAIL（`snapshots/cedar.json` 不存在）。

- [ ] **Step 3: 写生成脚本**

```js
#!/usr/bin/env node
/**
 * 生成 AI Guardian 演示的 Cedar 快照：用真实 aster-api 导出当前规则源。
 *
 * aster-dev 没有 Cedar 引擎，只能借本地 aster-api 生成；CI 不联网，只做新鲜度比对
 * （src/features/guardian/snapshots.test.ts）。用法：
 *   ASTER_API_URL=http://localhost:8080 ASTER_API_KEY=ak_… pnpm guardian:snapshots
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { GUARD_SOURCE } from '../src/features/guardian/scenario.ts';

const base = process.env.ASTER_API_URL || 'http://localhost:8080';
const key = process.env.ASTER_API_KEY;
if (!key) {
  console.error('缺少 ASTER_API_KEY（本地栈的 API key）');
  process.exit(1);
}

const res = await fetch(`${base}/api/v1/policies/export/cedar`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ source: GUARD_SOURCE, locale: 'en-US' }),
});
const body = await res.json();
const expectedHash = createHash('sha256').update(GUARD_SOURCE).digest('hex');
const problems = [
  res.status !== 200 && `HTTP ${res.status}`,
  body.exportable !== true && `exportable=${body.exportable} ${JSON.stringify(body.diagnostics)}`,
  body.probes?.agreed !== body.probes?.count && `probes ${JSON.stringify(body.probes)}`,
  body.sourceHash !== expectedHash && `sourceHash ${body.sourceHash} ≠ sha256(source) ${expectedHash}`,
].filter(Boolean);
if (problems.length > 0) {
  console.error('Cedar 导出不可用：', problems.join('; '));
  process.exit(1);
}

const snapshot = {
  sourceHash: body.sourceHash,
  ruleId: body.ruleId,
  moduleName: body.moduleName,
  exportable: body.exportable,
  probes: body.probes,
  controls: body.controls,
  policies: body.policies,
  schemaText: body.schemaText,
  generatedAt: new Date().toISOString(),
};
const out = new URL('../src/features/guardian/snapshots/cedar.json', import.meta.url);
writeFileSync(out, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`已写入 ${out.pathname}（${body.probes.count} 个探针一致）`);
```

在 `package.json` 的 `scripts` 中加入 `"guardian:snapshots": "node scripts/guardian-snapshots.mjs"`（放在 `"test"` 之后）。

- [ ] **Step 4: 生成快照（本地 aster-api 必须在 :8080 运行）**

```bash
mkdir -p src/features/guardian/snapshots
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/q/health/ready   # 期望 200
set -a && . /Users/rpang/.aster-stack/keys-20261013.env && set +a
ASTER_API_KEY="$KEY_T1" pnpm guardian:snapshots
```

Expected: 打印「已写入 …cedar.json（30 个探针一致）」；文件含 4 段 `@id("SUPPORT-001#N")` 策略。若本地 api 不可达：报告 BLOCKED（不得手写快照）。

- [ ] **Step 5: 运行确认通过**

Run: `pnpm exec vitest run src/features/guardian/snapshots.test.ts`
Expected: PASS（2 个测试）。

- [ ] **Step 6: 提交**

```bash
git add scripts/guardian-snapshots.mjs src/features/guardian/snapshots/cedar.json src/features/guardian/snapshots.test.ts package.json
git commit -m "$(cat <<'EOF'
feat(guardian): 由 aster-api 生成的 Cedar 快照与新鲜度检查

规则源变更而快照未更新时 CI 失败并提示重新生成。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 守卫状态机（`machine.ts`）

**Files:**
- Create: `src/features/guardian/machine.ts`
- Test: `src/features/guardian/machine.test.ts`

**Interfaces:**
- Consumes: `Decision`（Task 3）、`ToolCall`、`Principal`、`GUARD_MODULE`、`GUARD_ENTRY`、`RULE_ID`（Task 3）、`AuditFields`、`javaInstant`（Task 2）。
- Produces:
  - `DEMO_APPROVAL_TTL_MS = 60_000`
  - `type StepStatus = 'executed' | 'blocked' | 'pending' | 'approved' | 'rejected' | 'expired'`
  - `interface Step { id: string; decisionId: string; approvalId: string | null; principal: Principal; call: ToolCall; decision: Decision; status: StepStatus; requiredRole: string | null; requestedAt: number; expiresAt: number | null; decidedBy: string | null; comment: string | null }`
  - `type MachineError = 'self_approval' | 'comment_required' | 'not_pending' | null`
  - `interface GuardianState { steps: Step[]; events: Omit<AuditFields, 'prevHash'>[]; seq: number; error: MachineError }`
  - `type GuardianAction = { type: 'request'; principal: Principal; call: ToolCall; decision: Decision; at: number } | { type: 'approve'; approvalId: string; approver: string; at: number } | { type: 'reject'; approvalId: string; approver: string; comment: string; at: number } | { type: 'tick'; at: number } | { type: 'expire'; approvalId: string; at: number } | { type: 'reset' }`
  - `initialState: GuardianState`
  - `guardianReducer(state: GuardianState, action: GuardianAction): GuardianState`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import type { Decision } from './engine';
import { DEMO_APPROVAL_TTL_MS, guardianReducer, initialState, type GuardianAction, type GuardianState } from './machine';
import { SUPPORT_BOT } from './scenario';

const T0 = Date.UTC(2026, 9, 18, 9, 0, 0);
const allow: Decision = { outcome: 'ALLOW', reason: null, role: null, reasonCode: null, ruleLine: 13 };
const needsDpo: Decision = { outcome: 'REQUIRE_APPROVAL', reason: 'customer record deletion', role: 'Data Protection Officer', reasonCode: null, ruleLine: 10 };
const escalate: Decision = { outcome: 'ESCALATE', reason: 'large refund', role: null, reasonCode: null, ruleLine: 11 };
const run = (actions: GuardianAction[], from: GuardianState = initialState) => actions.reduce(guardianReducer, from);
const del = { tool: 'delete_customer_record' as const, args: { customer_id: 'cust_8812' } };

describe('guardianReducer', () => {
  it('ALLOW → 立即执行，1 个决策证据（success=true）', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'o', amount: 40 } }, decision: allow, at: T0 }]);
    expect(s.steps[0].status).toBe('executed');
    expect(s.events).toHaveLength(1);
    expect(s.events[0]).toMatchObject({ eventType: 'ACTION_GUARD_DECISION', success: true, performedBy: 'support-bot', tenantId: 'demo', timestamp: '2026-10-18T09:00:00Z' });
  });

  it('REQUIRE_APPROVAL → 待审批，带角色与过期时间', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    expect(s.steps[0]).toMatchObject({ status: 'pending', requiredRole: 'Data Protection Officer', expiresAt: T0 + DEMO_APPROVAL_TTL_MS });
    expect(s.events[0].success).toBe(false);
  });

  it('批准 → approved，追加审批证据（success=true，performedBy=审批人）', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'dana', at: T0 + 5000 });
    expect(s2.steps[0]).toMatchObject({ status: 'approved', decidedBy: 'dana' });
    expect(s2.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', success: true, performedBy: 'dana' });
  });

  it('请求方不能审批自己的请求', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'approve', approvalId: s1.steps[0].approvalId!, approver: 'support-bot', at: T0 + 1000 });
    expect(s2.error).toBe('self_approval');
    expect(s2.steps[0].status).toBe('pending');
    expect(s2.events).toHaveLength(1);
  });

  it('拒绝必须附说明；附说明后 rejected，审批证据 success=false', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'INV-77', amount: 12000 } }, decision: escalate, at: T0 }]);
    const id = s1.steps[0].approvalId!;
    const noComment = guardianReducer(s1, { type: 'reject', approvalId: id, approver: 'dana', comment: '  ', at: T0 + 1000 });
    expect(noComment.error).toBe('comment_required');
    expect(noComment.events).toHaveLength(1);
    const ok = guardianReducer(s1, { type: 'reject', approvalId: id, approver: 'dana', comment: 'invoice not delivered yet', at: T0 + 1000 });
    expect(ok.steps[0]).toMatchObject({ status: 'rejected', comment: 'invoice not delivered yet' });
    expect(ok.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', success: false });
  });

  it('过期 → expired（按 DENY 处理），审批证据由 SYSTEM 发起', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const s2 = guardianReducer(s1, { type: 'tick', at: T0 + DEMO_APPROVAL_TTL_MS });
    expect(s2.steps[0].status).toBe('expired');
    expect(s2.events[1]).toMatchObject({ eventType: 'ACTION_GUARD_APPROVAL', performedBy: 'SYSTEM', success: false });
  });

  it('重复 / 过期后的审批为无操作，不追加第二个证据块', () => {
    const s1 = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }]);
    const id = s1.steps[0].approvalId!;
    const once = guardianReducer(s1, { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 1000 });
    const twice = guardianReducer(once, { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 2000 });
    expect(twice.events).toHaveLength(2);
    expect(twice.error).toBe('not_pending');
    const expired = guardianReducer(guardianReducer(s1, { type: 'expire', approvalId: id, at: T0 + 3000 }), { type: 'approve', approvalId: id, approver: 'dana', at: T0 + 4000 });
    expect(expired.steps[0].status).toBe('expired');
    expect(expired.events).toHaveLength(2);
  });

  it('DENY / evaluation_failed → blocked，决策证据 reason 记录 reasonCode', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: { tool: 'issue_refund', args: { order_id: 'o' } },
      decision: { outcome: 'DENY', reason: null, role: null, reasonCode: 'evaluation_failed', ruleLine: null }, at: T0 }]);
    expect(s.steps[0].status).toBe('blocked');
    expect(s.events[0]).toMatchObject({ success: false, reason: 'evaluation_failed' });
  });

  it('reset 回到初始状态', () => {
    const s = run([{ type: 'request', principal: SUPPORT_BOT, call: del, decision: needsDpo, at: T0 }, { type: 'reset' }]);
    expect(s).toEqual(initialState);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm exec vitest run src/features/guardian/machine.test.ts`
Expected: FAIL（模块不存在）。

- [ ] **Step 3: 实现**

```ts
import type { AuditFields } from './evidence';
import { javaInstant } from './evidence';
import type { Decision } from './engine';
import { GUARD_ENTRY, GUARD_MODULE, RULE_ID, type Principal, type ToolCall } from './scenario';

/**
 * 守卫演示状态机（纯 reducer）：请求 → 裁决 → 审批 / 拒绝 / 过期 → 执行或阻断，并按 aster-api 的
 * 事件形状产出证据事件（哈希由 use-guardian 异步计算，reducer 保持同步可测）。
 *
 * 与生产一致的约束：请求方不能自批；拒绝须附说明；过期视为 DENY 且由 SYSTEM 记证据；
 * 已结束的审批再次操作为无操作。
 */
export const DEMO_APPROVAL_TTL_MS = 60_000;

export type StepStatus = 'executed' | 'blocked' | 'pending' | 'approved' | 'rejected' | 'expired';
export type MachineError = 'self_approval' | 'comment_required' | 'not_pending' | null;

export interface Step {
  id: string;
  decisionId: string;
  approvalId: string | null;
  principal: Principal;
  call: ToolCall;
  decision: Decision;
  status: StepStatus;
  requiredRole: string | null;
  requestedAt: number;
  expiresAt: number | null;
  decidedBy: string | null;
  comment: string | null;
}

export interface GuardianState {
  steps: Step[];
  events: Omit<AuditFields, 'prevHash'>[];
  seq: number;
  error: MachineError;
}

export type GuardianAction =
  | { type: 'request'; principal: Principal; call: ToolCall; decision: Decision; at: number }
  | { type: 'approve'; approvalId: string; approver: string; at: number }
  | { type: 'reject'; approvalId: string; approver: string; comment: string; at: number }
  | { type: 'tick'; at: number }
  | { type: 'expire'; approvalId: string; at: number }
  | { type: 'reset' };

export const initialState: GuardianState = { steps: [], events: [], seq: 0, error: null };

const NEEDS_APPROVAL = new Set(['REQUIRE_APPROVAL', 'ESCALATE']);

function decisionEvent(step: Step): Omit<AuditFields, 'prevHash'> {
  const d = step.decision;
  return {
    eventType: 'ACTION_GUARD_DECISION',
    timestamp: javaInstant(step.requestedAt),
    tenantId: 'demo',
    performedBy: step.principal.id,
    policyModule: GUARD_MODULE,
    policyFunction: GUARD_ENTRY,
    toVersion: 1,
    success: d.outcome === 'ALLOW',
    reason: d.reasonCode,
    metadata: JSON.stringify({
      decisionId: step.decisionId, outcome: d.outcome, reason: d.reason, ruleId: RULE_ID,
      actionName: step.call.tool, approvalId: step.approvalId,
    }),
  };
}

function approvalEvent(step: Step, outcome: 'APPROVED' | 'REJECTED' | 'EXPIRED', at: number): Omit<AuditFields, 'prevHash'> {
  return {
    eventType: 'ACTION_GUARD_APPROVAL',
    timestamp: javaInstant(at),
    tenantId: 'demo',
    performedBy: step.decidedBy ?? 'SYSTEM',
    success: outcome === 'APPROVED',
    metadata: JSON.stringify({
      decisionId: step.decisionId, approvalId: step.approvalId, outcome,
      decidedBy: step.decidedBy, requiredRole: step.requiredRole, comment: step.comment,
    }),
  };
}

function request(state: GuardianState, a: Extract<GuardianAction, { type: 'request' }>): GuardianState {
  const seq = state.seq + 1;
  const pending = NEEDS_APPROVAL.has(a.decision.outcome);
  const step: Step = {
    id: `step-${seq}`, decisionId: `dec-${seq}`, approvalId: pending ? `apr-${seq}` : null,
    principal: a.principal, call: a.call, decision: a.decision,
    status: pending ? 'pending' : a.decision.outcome === 'ALLOW' ? 'executed' : 'blocked',
    requiredRole: pending ? a.decision.role : null, requestedAt: a.at,
    expiresAt: pending ? a.at + DEMO_APPROVAL_TTL_MS : null, decidedBy: null, comment: null,
  };
  return { steps: [...state.steps, step], events: [...state.events, decisionEvent(step)], seq, error: null };
}

/** 结束一个待审批项；不在待审批状态时为无操作并标记 not_pending。 */
function settle(state: GuardianState, approvalId: string, at: number, patch: Pick<Step, 'status' | 'decidedBy' | 'comment'>): GuardianState {
  const target = state.steps.find((s) => s.approvalId === approvalId);
  if (!target || target.status !== 'pending') return { ...state, error: 'not_pending' };
  const done: Step = { ...target, ...patch };
  const outcome = patch.status === 'approved' ? 'APPROVED' : patch.status === 'rejected' ? 'REJECTED' : 'EXPIRED';
  return {
    ...state,
    steps: state.steps.map((s) => (s.id === done.id ? done : s)),
    events: [...state.events, approvalEvent(done, outcome, at)],
    error: null,
  };
}

function guardApprover(state: GuardianState, approvalId: string, approver: string): MachineError {
  const target = state.steps.find((s) => s.approvalId === approvalId);
  return target && target.principal.id === approver ? 'self_approval' : null;
}

export function guardianReducer(state: GuardianState, action: GuardianAction): GuardianState {
  switch (action.type) {
    case 'request':
      return request(state, action);
    case 'approve': {
      const error = guardApprover(state, action.approvalId, action.approver);
      if (error) return { ...state, error };
      return settle(state, action.approvalId, action.at, { status: 'approved', decidedBy: action.approver, comment: null });
    }
    case 'reject': {
      const error = guardApprover(state, action.approvalId, action.approver);
      if (error) return { ...state, error };
      if (action.comment.trim() === '') return { ...state, error: 'comment_required' };
      return settle(state, action.approvalId, action.at, { status: 'rejected', decidedBy: action.approver, comment: action.comment.trim() });
    }
    case 'expire':
      return settle(state, action.approvalId, action.at, { status: 'expired', decidedBy: null, comment: null });
    case 'tick':
      return state.steps
        .filter((s) => s.status === 'pending' && s.expiresAt !== null && action.at >= s.expiresAt)
        .reduce((acc, s) => settle(acc, s.approvalId!, action.at, { status: 'expired', decidedBy: null, comment: null }), state);
    case 'reset':
      return initialState;
  }
}
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm exec vitest run src/features/guardian/machine.test.ts`
Expected: PASS（9 个测试）。

- [ ] **Step 5: 提交**

```bash
git add src/features/guardian/machine.ts src/features/guardian/machine.test.ts
git commit -m "$(cat <<'EOF'
feat(guardian): 守卫演示状态机

不可自批、拒绝须附说明、过期视为 DENY；按 aster-api 事件形状产出证据事件。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 剧情时间线（`director.ts`）

**Files:**
- Create: `src/features/guardian/director.ts`
- Test: `src/features/guardian/director.test.ts`

**Interfaces:**
- Consumes: `StoryBeat`、`STORY_BEATS`（Task 3）。
- Produces:
  - `type CueKind = 'customer' | 'call' | 'approver' | 'outcome' | 'cedar'`
  - `interface Cue { index: number; beatIndex: number | null; kind: CueKind; atMs: number }`
  - `buildTimeline(beats: StoryBeat[]): Cue[]`
  - `STORY_DURATION_MS: number`
  - `cuesBetween(timeline: Cue[], fromIndex: number, elapsedMs: number): Cue[]` — 返回尚未派发且 `atMs ≤ elapsedMs` 的提示（按 index 推进，每个只派发一次）。

- [ ] **Step 1: 写失败测试**

```ts
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
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm exec vitest run src/features/guardian/director.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现**

```ts
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
```

- [ ] **Step 4: 运行确认通过**

Run: `pnpm exec vitest run src/features/guardian/director.test.ts`
Expected: PASS（4 个测试）。时长检查：GAP 合计 = 4×(2500+3000+3500) + 2×4000 + 6000 = 50,000 ms。

- [ ] **Step 5: 提交**

```bash
git add src/features/guardian/director.ts src/features/guardian/director.test.ts
git commit -m "$(cat <<'EOF'
feat(guardian): 剧情时间线

按提示索引推进，标签页节流后补派且不重复。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: i18n、钩子与共享展示件

**Files:**
- Modify: `messages/en.json`、`messages/zh.json`、`messages/de.json`、`messages/hi.json`（新增顶层 `guardianDemo`；`demosIndex.cards.guardian`；`demosIndex.subtitle` 中「Four live demos」改为「Five live demos」及各语言对应）
- Create: `src/features/guardian/use-guardian.ts`、`src/features/guardian/use-director.ts`、`src/features/guardian/cedar-source.ts`、`src/features/guardian/cedar-source.test.ts`
- Create: `src/features/guardian/components/{verdict-badge,approver-panel,evidence-chain,cedar-panel,rule-panel,tool-call-card}.tsx`

**Interfaces:**
- Consumes: Task 2–6 全部导出；`cedar.json`。
- Produces:
  - `isBuiltInSource(source: string): boolean`（cedar-source.ts：去掉行尾空白后与 `GUARD_SOURCE` 比较）
  - `useGuardian(opts?: { now?: () => number }): { state: GuardianState; chain: EvidenceBlock[]; engine: GuardEngine; setSource(src: string): void; request(principal: Principal, call: ToolCall): Decision; approve(approvalId: string): void; reject(approvalId: string, comment: string): void; expire(approvalId: string): void; reset(): void }`——审批人恒为 `APPROVER.id`；每秒 dispatch 一次 `tick`；`chain` 由 `buildChain(state.events)` 在 effect 中异步计算（以 events 长度为依赖，旧结果被新结果覆盖时丢弃过期 Promise）。
  - `useDirector(timeline: Cue[], onCue: (cue: Cue) => void): { playing: boolean; cueIndex: number; play(): void; pause(): void; step(): void; replay(): void }`——`prefers-reduced-motion: reduce` 时初始 `playing=false`；用 `requestAnimationFrame` + 累计已播放时长，调用 `cuesBetween`。
  - 组件 props：
    - `VerdictBadge({ outcome, reasonCode })` — 文字 + 颜色（`ALLOW` 绿、`DENY` 红、`REQUIRE_APPROVAL` 琥珀、`ESCALATE` 紫），文字取 `guardianDemo.verdict.<OUTCOME>`。
    - `ApproverPanel({ steps, onApprove, onReject, onExpire, now, compact? })` — 只列 `pending` 步骤；拒绝需输入说明，空说明时按钮禁用并显示 `guardianDemo.approver.commentRequired`；显示倒计时与 `guardianDemo.approver.ttlNote`。
    - `EvidenceChain({ chain, layout: 'row' | 'column' })` — 每块显示 `#index`、事件类型短名、`prevHash` 前 8 位 → `hash` 前 8 位。
    - `CedarPanel({ source })` — 展示 `cedar.json` 的 `policies`；`!isBuiltInSource(source)` 时在顶部显示 `guardianDemo.cedar.builtInNote`。
    - `RulePanel({ source, editable, highlightLine, diagnostics, onChange })` — 等宽字体逐行渲染，`highlightLine` 行加 `bg-warning/20 outline outline-1 outline-warning`；`editable` 时为 `<textarea>`（300 ms 防抖调用 `onChange`），诊断列于下方「第 N 行：message」。
    - `ToolCallCard({ step, variant: 'pipeline' | 'agent' })` — 显示工具名与参数 JSON、裁决徽章；`agent` 变体在 `pending` 时显示 `guardianDemo.agent.held`，`blocked/rejected/expired` 时显示 `guardianDemo.agent.blocked`（插值 `reason`、`decisionId`）。

- [ ] **Step 1: 写失败测试（cedar-source）**

```ts
import { describe, expect, it } from 'vitest';
import { isBuiltInSource } from './cedar-source';
import { GUARD_SOURCE } from './scenario';

describe('isBuiltInSource', () => {
  it('原样或仅行尾空白差异 → 内置', () => {
    expect(isBuiltInSource(GUARD_SOURCE)).toBe(true);
    expect(isBuiltInSource(GUARD_SOURCE.replace(/\n/g, '  \n'))).toBe(true);
  });
  it('任何实质改动 → 非内置（Cedar 面板须标注）', () => {
    expect(isBuiltInSource(GUARD_SOURCE.replace('10000', '5000'))).toBe(false);
  });
});
```

- [ ] **Step 2: 运行确认失败，然后实现**

```ts
import { GUARD_SOURCE } from './scenario';

/** 当前规则源是否就是生成 Cedar 快照的内置规则（忽略行尾空白）。 */
const normalize = (s: string) => s.split('\n').map((l) => l.trimEnd()).join('\n').trim();
const BUILT_IN = normalize(GUARD_SOURCE);

export function isBuiltInSource(source: string): boolean {
  return normalize(source) === BUILT_IN;
}
```

Run: `pnpm exec vitest run src/features/guardian/cedar-source.test.ts` → PASS（2）。

- [ ] **Step 3: 消息（en 原文，逐字使用）**

在 `messages/en.json` 顶层加入：

```json
"guardianDemo": {
  "seo": {
    "title": "AI Guardian demo — Aster Lang",
    "description": "Watch an AI support agent's tool calls get checked by a plain-language Aster rule: allowed, escalated, sent for four-eyes approval or denied — with a hash-linked evidence trail and the same rule exported to Cedar."
  },
  "eyebrow": "AI governance",
  "title": "AI Guardian",
  "subtitle": "Every tool call an AI agent makes is checked by an Aster rule before it runs. Risky ones wait for a person; every decision leaves evidence.",
  "views": { "stage": "Sandbox", "agent": "MCP agent", "story": "Story" },
  "verdict": { "ALLOW": "Allowed", "DENY": "Denied", "REQUIRE_APPROVAL": "Needs approval", "ESCALATE": "Escalated" },
  "status": { "executed": "Executed", "blocked": "Blocked", "pending": "Waiting for approval", "approved": "Approved — executed", "rejected": "Rejected — blocked", "expired": "Expired — denied" },
  "reasonCode": { "evaluation_failed": "Rule evaluation failed — fail closed", "not_a_verdict": "Rule did not return a verdict — fail closed" },
  "tools": { "issue_refund": "Issue refund", "delete_customer_record": "Delete customer record", "lookup_order": "Look up order" },
  "sandbox": {
    "requester": "Support agent",
    "amount": "Refund amount (€)",
    "suspended": "Agent account suspended",
    "fire": "Call tool",
    "reset": "Reset"
  },
  "approver": {
    "title": "Approvals — {name}",
    "role": "Data Protection Officer",
    "anyApprover": "any approver",
    "empty": "Nothing waiting for approval.",
    "approve": "Approve",
    "reject": "Reject",
    "expire": "Let it expire",
    "commentPlaceholder": "Reason for rejecting (required)",
    "commentRequired": "A rejection needs a comment.",
    "selfApproval": "The requester cannot approve their own request.",
    "expiresIn": "Expires in {seconds} s",
    "ttlNote": "Demo: 60 s · production: 24 h"
  },
  "rule": { "title": "Rule", "matched": "Matched line", "diagnostics": "Line {line}: {message}", "keepsLast": "The demo keeps running on the last rule that compiled." },
  "evidence": { "title": "Evidence chain", "empty": "No decisions yet.", "decision": "Decision", "approval": "Approval" },
  "cedar": { "title": "Cedar", "builtInNote": "This is the Cedar export of the built-in rule; your edits are not reflected here.", "probes": "{agreed}/{count} probes agree with the Aster engine" },
  "agent": {
    "assistant": "Assistant",
    "checking": "aster-guard: checking {policy}…",
    "held": "Held by aster-guard (approval-timeout 300 s)",
    "blocked": "Blocked by Aster Guard: {reason} (decision {decisionId})",
    "result": "Tool result: done"
  },
  "story": {
    "play": "Play",
    "pause": "Pause",
    "step": "Next step",
    "replay": "Replay",
    "tryIt": "Try it yourself →",
    "beat1": { "customer": "My €40 order arrived broken.", "agent": "Sorry about that — refund issued." },
    "beat2": { "customer": "Also refund invoice INV-77, €12,000.", "agent": "A reviewer declined this refund — they'll be in touch.", "rejectComment": "Invoice not delivered yet" },
    "beat3": { "customer": "Delete my account and all my data.", "agent": "Done — your record has been deleted." },
    "beat4": { "customer": "Refund €10 please.", "agent": "I can't do that right now — this account is suspended." },
    "cedar": "The same rule, exported to Cedar."
  }
},
```

在 `demosIndex.cards` 中加入：

```json
"guardian": { "title": "AI Guardian 🛡️", "description": "An AI support agent's tool calls are checked by an Aster rule — allowed, escalated, sent for four-eyes approval or denied, with a hash-linked evidence trail and a Cedar export." }
```

zh / de / hi：逐键翻译以上全部字符串（保留 `{name}`、`{seconds}`、`{policy}`、`{reason}`、`{decisionId}`、`{line}`、`{message}`、`{agreed}`、`{count}` 占位符原样；`Dana`、`aster-guard`、`Cedar`、`MCP`、`INV-77`、`€` 金额原样；hi 必须为天城文，`Cedar` 写作 `सीडर`，与现有 hi 一致）。`demosIndex.subtitle` 把「四个」改为「五个」（各语言同义改动）。

- [ ] **Step 4: 运行 i18n 一致性测试**

Run: `pnpm exec vitest run src/i18n/locale-parity.test.ts src/i18n/messages-loader.test.ts`
Expected: PASS。若 hi 断言失败（Latin 残留），修正译文而不是改测试。

- [ ] **Step 5: 实现两个钩子**

`use-guardian.ts`：

```ts
'use client';

import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { buildChain, type EvidenceBlock } from './evidence';
import { createEngine, type Decision, type GuardEngine } from './engine';
import { guardianReducer, initialState } from './machine';
import { APPROVER, GUARD_SOURCE, toGuardRequest, type Principal, type ToolCall } from './scenario';

/**
 * 演示的 React 外壳：持有引擎与状态机，按秒推进过期，异步计算证据哈希链。
 * 审批动作恒以 APPROVER（Dana）身份发出——请求方一侧没有审批入口。
 */
export function useGuardian(opts: { now?: () => number } = {}) {
  const now = opts.now ?? Date.now;
  const [state, dispatch] = useReducer(guardianReducer, initialState);
  const [engine, setEngine] = useState<GuardEngine>(() => createEngine(GUARD_SOURCE));
  const [chain, setChain] = useState<EvidenceBlock[]>([]);

  useEffect(() => {
    const id = setInterval(() => dispatch({ type: 'tick', at: now() }), 1000);
    return () => clearInterval(id);
  }, [now]);

  useEffect(() => {
    let current = true;
    void buildChain(state.events).then((c) => { if (current) setChain(c); });
    return () => { current = false; };
  }, [state.events]);

  const setSource = useCallback((src: string) => setEngine((prev) => createEngine(src, prev)), []);
  const request = useCallback((principal: Principal, call: ToolCall): Decision => {
    const decision = engine.decide(toGuardRequest(principal, call));
    dispatch({ type: 'request', principal, call, decision, at: now() });
    return decision;
  }, [engine, now]);
  const approve = useCallback((approvalId: string) => dispatch({ type: 'approve', approvalId, approver: APPROVER.id, at: now() }), [now]);
  const reject = useCallback((approvalId: string, comment: string) => dispatch({ type: 'reject', approvalId, approver: APPROVER.id, comment, at: now() }), [now]);
  const expire = useCallback((approvalId: string) => dispatch({ type: 'expire', approvalId, at: now() }), [now]);
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  return useMemo(
    () => ({ state, chain, engine, setSource, request, approve, reject, expire, reset }),
    [state, chain, engine, setSource, request, approve, reject, expire, reset],
  );
}
```

`use-director.ts`：

```ts
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cuesBetween, type Cue } from './director';

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
      if (last.current !== null) elapsed.current += t - last.current;
      last.current = t;
      fire(cuesBetween(timeline, indexRef.current, elapsed.current));
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

  return { playing, cueIndex, play: () => setPlaying(true), pause: () => setPlaying(false), step, replay };
}
```

- [ ] **Step 6: 实现 6 个展示件**

每个文件以 `'use client';` 开头，使用 `useTranslations('guardianDemo')` 与 `cn` from `@/components/ui`；颜色用设计系统 token 类（`text-success` / `bg-success/15`、`text-danger` / `bg-danger/15`、`text-warning` / `bg-warning/15`、`text-primary` / `bg-primary/15`；若某 token 不存在，查 `src/app/globals.css` 的 `@theme` 中已定义的语义色并改用之，不新增颜色）。`VerdictBadge` 示例（其余组件按上面 Interfaces 中的 props 与文案键实现，所有可交互元素为 `<button type="button">`，带可见文字）：

```tsx
'use client';

import { useTranslations } from 'next-intl';
import { cn } from '@/components/ui';
import type { Outcome, ReasonCode } from '../engine';

const TONE: Record<Outcome, string> = {
  ALLOW: 'bg-success/15 text-success',
  DENY: 'bg-danger/15 text-danger',
  REQUIRE_APPROVAL: 'bg-warning/15 text-warning',
  ESCALATE: 'bg-primary/15 text-primary',
};

/** 裁决徽章：颜色之外始终有文字，失败原因以小字补充。 */
export function VerdictBadge({ outcome, reasonCode }: { outcome: Outcome; reasonCode?: ReasonCode | null }) {
  const t = useTranslations('guardianDemo');
  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', TONE[outcome])}>{t(`verdict.${outcome}`)}</span>
      {reasonCode && <span className="text-xs text-fg-muted">{t(`reasonCode.${reasonCode}`)}</span>}
    </span>
  );
}
```

`ApproverPanel` 的拒绝交互：每个待审批项一个受控 `<input>`；「拒绝」按钮在 `comment.trim() === ''` 时 `disabled`，旁边显示 `approver.commentRequired`；倒计时 `Math.max(0, Math.ceil((step.expiresAt - now) / 1000))` 秒，`now` 由父组件每秒刷新传入。`EvidenceChain` 在 `aria-live="polite"` 的容器中渲染，新块出现时屏幕阅读器播报「#N 决策 / 审批」。

- [ ] **Step 7: 类型检查与 lint**

Run: `pnpm exec tsc --noEmit -p . > /tmp/G-t7-tsc.log 2>&1; echo EXIT=$?` 与 `pnpm lint > /tmp/G-t7-lint.log 2>&1; echo EXIT=$?`
Expected: 两者 `EXIT=0`。

- [ ] **Step 8: 提交**

```bash
git add messages src/features/guardian
git commit -m "$(cat <<'EOF'
feat(guardian): 演示文案、钩子与共享展示件

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: 视图 A（舞台沙盒）与 `/demos/guardian` 页面

**Files:**
- Create: `src/features/guardian/views/stage.tsx`
- Create: `src/app/[locale]/demos/guardian/page.tsx`、`src/app/[locale]/demos/guardian/guardian-content.tsx`
- Modify: `src/app/[locale]/demos/page.tsx`（`DEMO_CARDS` 首位加入 `{ key: 'guardian', href: '/demos/guardian', emoji: '🛡️' }`，并更新文件头注释里的 demo 列表）

**Interfaces:**
- Consumes: `useGuardian`、全部展示件（Task 7）、`SUPPORT_BOT`、`SUSPENDED_BOT`。
- Produces: `StageView()`（无 props）；`GuardianContent({ locale })` 读取 `useSearchParams().get('view')`：`'agent'` → `AgentView`（Task 9 前先渲染 `StageView`），否则 `StageView`；顶部有「Sandbox / MCP agent」两个切换链接（`?view=` 查询参数，`aria-current` 标记当前）。

- [ ] **Step 1: 实现 `StageView`**

布局（≥ 1024 px 三栏，`lg:grid-cols-[1.1fr_auto_1.3fr]`；更窄时纵向堆叠）：
1. 左栏「Support agent」：三个工具按钮（`tools.*` 文案）；退款金额滑块 `<input type="range" min=0 max=20000 step=100>`，旁边数字显示；`suspended` 复选框；最近 6 个步骤列表，每项 `ToolCallCard variant="pipeline"` + 状态文字 `status.<status>`。按钮点击：`request(suspended ? SUSPENDED_BOT : SUPPORT_BOT, call)`，其中 `issue_refund` 的参数为 `{ order_id: 'ORD-' + (1000 + state.seq + 1), amount }`、`delete_customer_record` 为 `{ customer_id: 'cust_8812' }`、`lookup_order` 为 `{ order_id: 'ORD-1042' }`。
2. 中栏「Aster guard」：最近一次裁决的 `VerdictBadge` + 理由 + `ApproverPanel`（独立卡片，标题 `approver.title` 插值 `name: 'Dana'`；`state.error === 'self_approval'` 时显示 `approver.selfApproval`）。
3. 右栏标签页（`role="tablist"`，键盘左右切换）：`Rule`（`RulePanel editable highlightLine={最近一次裁决的 ruleLine} diagnostics={engine.diagnostics} onChange={setSource}`，有诊断时附 `rule.keepsLast`）、`Evidence`（`EvidenceChain layout="column"`）、`Cedar`（`CedarPanel source={engine.source}`）。
4. 右上角 `sandbox.reset` 按钮调用 `reset()`。

- [ ] **Step 2: 页面与内容组件**

`page.tsx` 照 `src/app/[locale]/demos/kitten/page.tsx` 的结构：`generateMetadata` 读 `guardianDemo.seo`，`alternates.canonical` 为 `/${locale}/demos/guardian`；默认导出 `setRequestLocale(locale)` 后渲染 `<main className="bg-bg"><GuardianContent locale={locale} /></main>`。`guardian-content.tsx` 为 `'use client'`，用 `<Suspense>` 包裹读取 `useSearchParams` 的子组件（静态渲染要求），标题区使用 `eyebrow` / `title` / `subtitle`。

- [ ] **Step 3: 本地验证**

```bash
(pnpm build > /tmp/G-t8-build.log 2>&1; echo EXIT=$? >> /tmp/G-t8-build.log) &
```
轮询至 `EXIT=`，期望 `EXIT=0` 且输出中有 `/[locale]/demos/guardian`。然后 `pnpm start -p 3210 &`，用浏览器（chrome-devtools MCP 或 Playwright）打开 `http://localhost:3210/en/demos/guardian`，依次：点「Issue refund」（40）→ 徽章 Allowed、证据 1 块；滑块到 12000 再点 → Escalated、审批面板出现；在审批面板输入说明后拒绝 → 状态 Rejected、证据 3 块；点「Delete customer record」→ Needs approval → Approve → Approved；勾选 suspended 再退款 → Denied；把规则里 `10000` 改为 `5000` → Cedar 标签页出现 builtInNote；把 `allow.` 改成 `allw.` → 出现「Line N: …」诊断（N 为该行行号）且按钮仍可用、裁决不变。截图保存到 `/Users/rpang/.aster-stack/guardian-verify/t8-*.png`，控制台无错误。

- [ ] **Step 4: 提交**

```bash
git add src/features/guardian/views/stage.tsx "src/app/[locale]/demos/guardian" "src/app/[locale]/demos/page.tsx"
git commit -m "$(cat <<'EOF'
feat(guardian): 舞台沙盒视图与 /demos/guardian 页面

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: 视图 C（MCP 代理对话）

**Files:**
- Create: `src/features/guardian/views/agent.tsx`
- Modify: `src/app/[locale]/demos/guardian/guardian-content.tsx`（`view=agent` 渲染 `AgentView`）

**Interfaces:**
- Consumes: `useGuardian`、`ToolCallCard variant="agent"`、`ApproverPanel`、`EvidenceChain`、`RulePanel`、`CedarPanel`、`STORY_BEATS`。
- Produces: `AgentView()`。

- [ ] **Step 1: 实现**

左侧（`lg:col-span-2`）为助手对话：
- 顶部四个「建议提示」按钮，文案为 `story.beat1..4.customer`；点击后依次追加：用户气泡（该台词）→ 助手的工具调用卡片（`ToolCallCard variant="agent"`，先显示 `agent.checking`，插值 `policy: 'guard.support/decide'`，300 ms 后调用 `request(beat.principal, beat.call)` 并显示裁决）→ 依状态追加助手回复：`executed`/`approved` → `story.beatN.agent` 的成功句 + `agent.result`；`blocked`/`rejected`/`expired` → `agent.blocked`（`reason` 取裁决理由或 reasonCode 文案，`decisionId` 取步骤的 `decisionId`）；`pending` → 卡片保持 `agent.held` 直到审批结束（订阅 `state.steps` 中该步骤状态变化后追加回复）。
- 底部一行灰字说明真实接入方式：「aster-guard-mcp 位于 MCP 主机与上游服务器之间；工具名 → action，参数 → context」（新增消息键 `agent.howItWorks`，4 语言，加入 Task 7 的命名空间并重跑 parity 测试）。

右侧为 `ApproverPanel`（Dana）与折叠区（`<details>`）内的 `RulePanel`（只读、高亮命中行）、`EvidenceChain layout="column"`、`CedarPanel`。

- [ ] **Step 2: 本地验证**

重新 `pnpm build` 与 `pnpm start -p 3210`，打开 `/en/demos/guardian?view=agent`：依次点四个提示，确认：第 1 条直接返回结果；第 2 条卡片挂起，审批人拒绝（填说明）后出现 `Blocked by Aster Guard: …(decision dec-2)`；第 3 条批准后出现成功回复；第 4 条立即 `Blocked by Aster Guard: suspended principal (decision dec-…)`。截图 `/Users/rpang/.aster-stack/guardian-verify/t9-*.png`。

- [ ] **Step 3: 提交**

```bash
git add src/features/guardian/views/agent.tsx "src/app/[locale]/demos/guardian/guardian-content.tsx" messages
git commit -m "$(cat <<'EOF'
feat(guardian): MCP 代理对话视图

工具调用由 aster-guard 内联拦截，拒绝文本与真实代理一致。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: 视图 B（流水线剧情）与嵌入路由

**Files:**
- Create: `src/features/guardian/views/pipeline.tsx`
- Create: `src/app/embed/guardian/[locale]/layout.tsx`、`src/app/embed/guardian/[locale]/page.tsx`
- Modify: `src/middleware.ts`（matcher 改为 `['/((?!api|embed|_next|_vercel|.*\\..*).*)']`，注释说明嵌入路由不走 locale 重写）
- Modify: `src/components/theme-provider.tsx`（新增可选 `forcedTheme?: string` 透传给 next-themes）

**Interfaces:**
- Consumes: `useGuardian`、`useDirector`、`buildTimeline`、`STORY_BEATS`、`APPROVER`、展示件。
- Produces: `PipelineView({ tryItHref }: { tryItHref: string })`。

- [ ] **Step 1: 实现 `PipelineView`**

- `const timeline = useMemo(() => buildTimeline(STORY_BEATS), [])`；`useDirector(timeline, onCue)`，`onCue` 按 `cue.kind` 处理：`customer` → 当前泳道显示客户台词；`call` → `request(beat.principal, beat.call)`；`approver` → 取「当前最后一个 `status === 'pending'` 的步骤」（`call` 提示派发的 `request` 在下一次渲染才进入 state，因此用 `useEffect` 把最新 `state` 同步到 `stateRef`，在提示回调里读 `stateRef.current`），按 `beat.approver`：`approve` 调 `approve(step.approvalId)`，`reject` 调 `reject(step.approvalId, t(beat.approver.commentKey))`；`outcome` → 显示 `story.beatN.agent`；`cedar` → 展开 Cedar 面板并显示 `story.cedar` 与 `story.tryIt` 链接（`href={tryItHref}`，`target="_top"`）。
- 每拍一条泳道：`Agent → Guard → Approval → Outcome` 四格，格间箭头；Approval 格在无审批时显示「—」，有审批时显示审批人 `Dana` 与动作结果；动画只用 `transition-[opacity,transform]`。
- 下方 `EvidenceChain layout="row"`（横向滚动）。
- 控制条：`story.play`/`story.pause` 切换、`story.step`、`story.replay`（replay 先调用 `reset()` 再调用 director 的 `replay()`）；控制条始终可见（WCAG 2.2.2）。
- 测试注意：开发模式 React StrictMode 下剧情不得出现重复步骤（证据链恰好 6 块）——Task 10 Step 3 用 `pnpm dev` 再核对一次。

- [ ] **Step 2: 嵌入路由**

`layout.tsx`（位于 `[locale]` 段之外，自带 `<html>/<body>`，无站点头尾）：

```tsx
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';

/** 嵌入页不进搜索索引；cloud 以 iframe 引用。 */
export const metadata: Metadata = { robots: { index: false, follow: false } };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * AI Guardian 嵌入布局：只提供主题、文案与样式，不渲染站点头尾。
 * 位于 [locale] 段之外，因为 [locale]/layout 会给所有页面加 SiteHeader / SiteFooter。
 */
export default async function EmbedLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="bg-bg text-fg antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

`globals.css` 已由根布局 `src/app/layout.tsx` 导入（根布局对嵌入路由同样生效），此处不要重复导入。照搬 `src/app/[locale]/layout.tsx` 的字体变量（`fraunces` / `inter` / `jetbrainsMono` 的定义与 `<html className>`）和 `<head>` 中的 `__name` 兜底 `<script>`（OpenNext 必需，见该文件注释）。

`page.tsx`：

```tsx
import { setRequestLocale } from 'next-intl/server';
import { EmbedStory } from './embed-story';

export default async function GuardianEmbedPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <EmbedStory locale={locale} />;
}
```

新建 `src/app/embed/guardian/[locale]/embed-story.tsx`（`'use client'`）：用 `<Suspense>` 读取 `useSearchParams().get('theme')`（`'dark'` 或 `'light'`，其他值视为 `undefined`），渲染 `<ThemeProvider forcedTheme={theme}><PipelineView tryItHref={`https://aster-lang.dev/${locale}/demos/guardian`} /></ThemeProvider>`，外层 `min-h-screen p-4`。

- [ ] **Step 3: 本地验证**

`pnpm build`（期望输出含 `/embed/guardian/[locale]`）后 `pnpm start -p 3210`：
- `curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3210/embed/guardian/en` → `200`，无重定向（中间件已排除）。
- `curl -s http://localhost:3210/embed/guardian/en | grep -c 'site-header\|<header'` → 0；`grep -c 'noindex'` → ≥ 1。
- 另起 `pnpm dev -p 3211`，打开 `http://localhost:3211/embed/guardian/en`，剧情跑完后证据链恰好 6 块（StrictMode 下无重复派发）。
- 浏览器打开 `http://localhost:3210/embed/guardian/zh?theme=dark`：剧情自动播放约 50 秒，四拍顺序与 spec §5.1 一致，证据链 6 块，结尾出现 Cedar 与「亲手试试 →」；暂停 / 单步 / 重放可用；用 DevTools 模拟 `prefers-reduced-motion: reduce` 后刷新，初始为暂停。截图 `/Users/rpang/.aster-stack/guardian-verify/t10-*.png`。
- `/en/demos/guardian` 仍带站点头尾（回归）。

- [ ] **Step 4: 提交**

```bash
git add src/features/guardian/views/pipeline.tsx src/app/embed src/middleware.ts src/components/theme-provider.tsx
git commit -m "$(cat <<'EOF'
feat(guardian): 流水线剧情视图与无站点头尾的嵌入路由

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: aster-dev 渲染矩阵与预算验证

**Files:**
- Create: `/Users/rpang/.aster-stack/guardian-verify/report.md`（不入库）

- [ ] **Step 1: 全量门禁（后台 + 日志）**

`pnpm test`、`pnpm lint`、`pnpm build` 各自后台运行，期望全部 `EXIT=0`；记录测试总数（应为原 189 + 本计划新增）。

- [ ] **Step 2: 渲染矩阵**

在 `pnpm start -p 3210` 上，对 `{/demos/guardian, /demos/guardian?view=agent, /embed/guardian}` × `{en, zh, de, hi}` × `{light, dark}`（嵌入用 `?theme=`，其余切换站点主题）共 24 个组合 + 每个视图 375 px 宽各 1 张：确认无控制台错误、无 hydration 警告、无文字溢出；hi 页面无英文未译残留（`Dana`、`aster-guard`、工具标识符、`INV-77` 除外）。截图存目录。

- [ ] **Step 3: 预算**

- 路由代码：对比 `pnpm build` 输出中 `/[locale]/demos/guardian` 与 `/[locale]/demos/kitten` 的首屏 JS（或 `.next/static/chunks` 中该路由专属 chunk 的 gzip 大小：`gzip -c <chunk> | wc -c`），新增 ≤ 35 KB gzip。
- 编译耗时：在页面控制台执行 `performance.now()` 包裹一次 `createEngine` 的计时（或在测试中记录），≤ 50 ms。
- 把数据与截图清单写入 report.md；任何一项超标：报告 DONE_WITH_CONCERNS 并附数据。

---

### Task 12: aster-cloud CSP、入口、落地区块与 i18n

**Files:**
- Modify: `src/lib/security/csp.ts`、`src/__tests__/lib/csp.test.ts`
- Create: `src/components/marketing/guardian-embed.tsx`、`src/__tests__/components/guardian-embed-url.test.ts`
- Create: `src/app/[locale]/demos/guardian/page.tsx`
- Modify: `src/app/[locale]/page.tsx`、`src/app/[locale]/demos/page.tsx`、`src/i18n/demo-supplement.ts`、`config/routes.yaml`
- Create: `public/images/guardian-poster.webp`

**Interfaces:**
- Produces:
  - `GUARDIAN_EMBED_ORIGIN`（csp.ts 导出：`NEXT_PUBLIC_GUARDIAN_EMBED_URL` 的 origin，缺省 `https://aster-lang.dev`；加入 `frame-src`）
  - `guardianEmbedUrl(locale: string, theme: 'light' | 'dark', base?: string): string`（guardian-embed.tsx 导出，纯函数）
  - `GuardianEmbed({ locale, posterAlt }: { locale: string; posterAlt: string })`（client）

- [ ] **Step 1: 建 worktree 并安装**

```bash
cd /Users/rpang/IdeaProjects/aster-cloud && git fetch origin main && git worktree add -b feat/guardian-embed /Users/rpang/IdeaProjects/aster-cloud-guardian origin/main
cd /Users/rpang/IdeaProjects/aster-cloud-guardian && (pnpm install --frozen-lockfile > /tmp/G-c-install.log 2>&1; echo EXIT=$? >> /tmp/G-c-install.log) &
```

- [ ] **Step 2: 写失败测试**

在 `src/__tests__/lib/csp.test.ts` 末尾 `describe` 内追加（照该文件现有用例构造 CSP 字符串的方式取得 `csp`）：

```ts
  it('allows the aster-lang.dev AI Guardian embed in frame-src only', () => {
    expect(csp).toMatch(/frame-src [^;]*https:\/\/aster-lang\.dev/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
  });
```

`src/__tests__/components/guardian-embed-url.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { guardianEmbedUrl } from '@/components/marketing/guardian-embed';

describe('guardianEmbedUrl', () => {
  it('locale 进路径、theme 进查询参数', () => {
    expect(guardianEmbedUrl('zh', 'dark', 'https://aster-lang.dev/embed/guardian')).toBe('https://aster-lang.dev/embed/guardian/zh?theme=dark');
  });
  it('未知 locale 回退 en；去掉 base 末尾斜杠', () => {
    expect(guardianEmbedUrl('fr', 'light', 'https://x.test/embed/guardian/')).toBe('https://x.test/embed/guardian/en?theme=light');
  });
});
```

Run: `pnpm exec vitest run src/__tests__/lib/csp.test.ts src/__tests__/components/guardian-embed-url.test.ts --project saas` → FAIL。

- [ ] **Step 3: 实现 CSP 与嵌入组件**

csp.ts：在 `TURNSTILE_DOMAINS` 定义附近加入

```ts
// AI Guardian 演示：落地页与 /demos/guardian 以 iframe 嵌入 aster-lang.dev 的剧情（仅 SaaS 渲染）。
// 来源取自与嵌入组件相同的 NEXT_PUBLIC_GUARDIAN_EMBED_URL，本地验证指向本地 aster-dev 时无需改代码。
export const GUARDIAN_EMBED_ORIGIN = new URL(
  process.env.NEXT_PUBLIC_GUARDIAN_EMBED_URL || 'https://aster-lang.dev/embed/guardian',
).origin;
```

并把 `'frame-src'` 改为 `["'self'", ...STRIPE_DOMAINS, ...TURNSTILE_DOMAINS, GUARDIAN_EMBED_ORIGIN]`。

guardian-embed.tsx：

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useTheme } from 'next-themes';

const EMBED_LOCALES = ['en', 'zh', 'de', 'hi'];
const DEFAULT_BASE = process.env.NEXT_PUBLIC_GUARDIAN_EMBED_URL || 'https://aster-lang.dev/embed/guardian';

export function guardianEmbedUrl(locale: string, theme: 'light' | 'dark', base: string = DEFAULT_BASE): string {
  const loc = EMBED_LOCALES.includes(locale) ? locale : 'en';
  return `${base.replace(/\/+$/, '')}/${loc}?theme=${theme}`;
}

/**
 * AI Guardian 剧情嵌入：先显示静态海报，区块接近视口时才创建 iframe，不影响首屏 LCP。
 */
export function GuardianEmbed({ locale, posterAlt }: { locale: string; posterAlt: string }) {
  const { resolvedTheme } = useTheme();
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const theme = resolvedTheme === 'dark' ? 'dark' : 'light';
  return (
    <div ref={box} className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-border bg-bg-muted">
      {visible ? (
        <iframe title={posterAlt} src={guardianEmbedUrl(locale, theme)} className="h-full w-full" loading="lazy" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- 静态海报占位，尺寸固定，无需 next/image 优化管线
        <img src="/images/guardian-poster.webp" alt={posterAlt} className="h-full w-full object-cover" width={1280} height={800} />
      )}
    </div>
  );
}
```

（若 aster-cloud 的主题库不是 `next-themes`，用 `src/components` 中现有主题钩子替换 `useTheme`；检查 `grep -rn "useTheme" src/components | head`。）

- [ ] **Step 4: 页面、卡片、落地区块、文案、路由登记**

- `src/app/[locale]/demos/guardian/page.tsx`：`if (!IS_SAAS) notFound();`；`generateMetadata` 读 `guardianPage.seo`；正文标题 / 副标题 + `<GuardianEmbed locale={locale} posterAlt={t('posterAlt')} />` + 「亲手试试 →」链接到 `https://aster-lang.dev/${locale}/demos/guardian`。
- `src/app/[locale]/demos/page.tsx`：`DEMO_CARDS` 首位条件加入 `...(IS_SAAS ? [{ key: 'guardian', href: '/demos/guardian', emoji: '🛡️' }] : [])`（保持 `as const` 可用的写法，必要时改为显式类型数组）。
- `src/app/[locale]/page.tsx`：`<Features t={t} />` 之后插入 `{IS_SAAS && <GuardianShowcase locale={locale} />}`；`GuardianShowcase` 在同文件内定义（与 `Features` 同风格的 section：eyebrow / 标题 / 副标题 / `GuardianEmbed` / 「亲手试试 →」），文案取 `guardianShowcase.*`。
- `src/i18n/demo-supplement.ts` 四个 locale 各加入：

```ts
guardianShowcase: {
  eyebrow: 'AI governance',
  title: 'Every AI action, checked before it runs',
  subtitle: 'An AI support agent calls tools; a plain-language Aster rule allows, escalates, sends for four-eyes approval or denies each call — and every decision leaves hash-linked evidence.',
  posterAlt: 'AI Guardian demo: an agent’s tool calls pass through an Aster guard',
  tryIt: 'Try it yourself →',
},
guardianPage: {
  seo: { title: 'AI Guardian demo — Aster Cloud', description: 'Watch an AI agent’s tool calls get allowed, escalated, approved by a second person or denied by an Aster rule, with an evidence trail and a Cedar export.' },
  title: 'AI Guardian',
  subtitle: 'The same rule that runs here guards real agents through aster-guard.',
  posterAlt: 'AI Guardian demo: an agent’s tool calls pass through an Aster guard',
  tryIt: 'Try it yourself on aster-lang.dev →',
},
```

（en 原文如上；zh / de / hi 逐键翻译，hi 为天城文。）`demosIndex.cards.guardian` 照现有卡片结构加 `title` / `description`（与 aster-dev 的 en 文案一致）。
- `config/routes.yaml`：在 `/demos/kitten` 之前加入

```yaml
  - path: /demos/guardian
    status: canonical-here
    owner: marketing
    source: src/app/[locale]/demos/guardian/page.tsx
    locales: all
    notes: AI Guardian demo — embeds the aster-lang.dev story (SaaS only)
```

- [ ] **Step 5: 海报**

在 aster-dev 本地（Task 10 的 `pnpm start -p 3210`）截取 `http://localhost:3210/embed/guardian/en?theme=light` 在剧情第 3 拍审批出现时的画面（1280×800），转 WebP（质量 75），确保 ≤ 60 KB：

```bash
# 截图 /tmp/guardian.png（1280×800）后，用 next 自带的 sharp（0.35.x，经 next 解析，不新增依赖）转 WebP：
mkdir -p public/images
node -e "const sharp=require(require.resolve('sharp',{paths:[require.resolve('next')]})); sharp('/tmp/guardian.png').resize(1280,800).webp({quality:75}).toFile('public/images/guardian-poster.webp').then(i=>console.log(i.size))"
ls -l public/images/guardian-poster.webp   # 必须 ≤ 61440 字节；超出则把 quality 依次降到 65、55 重试
```

- [ ] **Step 6: 门禁**

后台运行并核对 `EXIT=0`：`pnpm exec vitest run src/__tests__/lib/csp.test.ts src/__tests__/components/guardian-embed-url.test.ts --project saas`、`pnpm exec tsc --noEmit`、`pnpm lint`、`pnpm check:message-keys`、`pnpm routes:check`。

- [ ] **Step 7: 提交**

```bash
git add src/lib/security/csp.ts src/__tests__/lib/csp.test.ts src/components/marketing/guardian-embed.tsx src/__tests__/components/guardian-embed-url.test.ts "src/app/[locale]/demos/guardian" "src/app/[locale]/page.tsx" "src/app/[locale]/demos/page.tsx" src/i18n/demo-supplement.ts config/routes.yaml public/images/guardian-poster.webp
git commit -m "$(cat <<'EOF'
feat(marketing): 嵌入 AI Guardian 演示（落地区块 + /demos/guardian）

CSP frame-src 放行 aster-lang.dev；仅 SaaS 渲染；海报占位、进入视口才创建 iframe。

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: aster-cloud Playwright 用例与 Lighthouse 预算

**Files:**
- Create: `src/__tests__/e2e-browser/guardian-demo.spec.ts`

- [ ] **Step 1: 写用例**

```ts
import { test, expect } from '@playwright/test';

/**
 * AI Guardian 嵌入：/demos/guardian 渲染 aster-lang.dev 的剧情 iframe 并到达第一拍。
 * 本地验证：BASE_CLOUD=http://localhost:3100 NEXT_PUBLIC_GUARDIAN_EMBED_URL 指向本地 aster-dev。
 */
test.describe('AI Guardian embed', () => {
  test('demo page embeds the story and reaches the first beat', async ({ page }) => {
    await page.goto('/en/demos/guardian');
    const frame = page.frameLocator('iframe[src*="/embed/guardian/en"]');
    await expect(frame.getByText('My €40 order arrived broken.')).toBeVisible({ timeout: 20_000 });
    await expect(frame.getByRole('button', { name: /pause|play/i })).toBeVisible();
  });

  test('landing shows the poster until scrolled near, then the iframe', async ({ page }) => {
    await page.goto('/en');
    await expect(page.locator('img[src="/images/guardian-poster.webp"]')).toHaveCount(1);
    await page.locator('img[src="/images/guardian-poster.webp"]').scrollIntoViewIfNeeded();
    await expect(page.locator('iframe[src*="/embed/guardian/"]')).toHaveCount(1, { timeout: 10_000 });
  });
});
```

- [ ] **Step 2: 本地运行**

aster-dev 在 :3210 运行（Task 10）；aster-cloud 以 `NEXT_PUBLIC_GUARDIAN_EMBED_URL=http://localhost:3210/embed/guardian` 在 worktree 中 `pnpm build && pnpm start -p 3110`（SaaS 模式，照仓库 `e2e` 任务所用的 env 方式；`GUARDIAN_EMBED_ORIGIN` 由同一个 env 推导，CSP 自动放行 `http://localhost:3210`，无需改代码）。然后：

```bash
(BASE_CLOUD=http://localhost:3110 pnpm exec playwright test src/__tests__/e2e-browser/guardian-demo.spec.ts > /tmp/G-t13.log 2>&1; echo EXIT=$? >> /tmp/G-t13.log) &
```
Expected: `EXIT=0`，2 passed。

- [ ] **Step 3: Lighthouse 预算**

在改动前（`origin/main` 构建）与改动后各测一次 `http://localhost:3110/en` 的 Lighthouse 性能分（chrome-devtools MCP `lighthouse_audit`，移动端预设，各 3 次取中位数）。期望：下降 ≤ 2 分，LCP 元素不是海报图。结果写入 `/Users/rpang/.aster-stack/guardian-verify/report.md`。

- [ ] **Step 4: 提交**

```bash
git add src/__tests__/e2e-browser/guardian-demo.spec.ts
git commit -m "$(cat <<'EOF'
test(e2e): AI Guardian 嵌入用例

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>
EOF
)"
```
