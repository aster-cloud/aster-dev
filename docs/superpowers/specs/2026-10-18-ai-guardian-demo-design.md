# AI Guardian 可视化演示 — 设计

- 日期：2026-10-18
- 状态：待评审
- 涉及仓库：aster-dev（实现主体）、aster-cloud（嵌入与入口）、aster-api（哈希黄金向量测试）
- 关联：ADR 0039–0048（CNL 可执行治理语言、Action Guard、四眼审批、证据链、Cedar 导出、BYOK）；
  文档页 `content/<locale>/{governance,action-guard,evidence,cedar-export,ai-assist}.mdx`

## 0. 实测修订（2026-10-18，编写实施计划时核实）

以下三点经实测推翻了初稿中的假设，**以本节为准**，后文已同步修改：

1. **规则形状**：`guard.refunds`（playground 模板）无法导出 Cedar——本地 aster-api 返回
   `E720: parameter type GuardRequest is not the guard request shape`。Cedar 导出（ADR 0047）只接受
   标准守卫请求形状（`principal_id, principal_type, principal_roles, action, resource_type, resource_id,
   context, agent_model`），这也正是 `aster-guard` 真实发送的形状。演示改用新规则 **`guard.support`
   （`@id("SUPPORT-001")`）**：语义同前（暂停主体 → DENY；删除客户记录 → 数据保护官审批；
   `issue_refund` 且 `context.amount ≥ 10000` → ESCALATE；其余 ALLOW）。实测：aster-lang-ts 1.0.35
   浏览器端编译通过、四种裁决正确、缺少 `amount` 的删除调用仍正确（`and` 短路）；aster-api 导出
   `exportable=true`、probes 30/30 一致。
2. **规则源不本地化**：Cedar 导出按英文字段名匹配，本地化字段名（如 `守卫请求`、`anfrage`）不可导出；
   文档 `cedar-export` 页在所有语言下也展示同一英文规则。故规则源为**单一英文版本**，只有 UI 文案本地化；
   Cedar 快照只有一份。初稿「复用 4 语言 governance-verdict 模板」「4 语言 Cedar 逐字节相同」作废。
3. **新鲜度依据**：aster-api 返回的 `sourceHash` 等于 `sha256(规则源)`（实测一致），新鲜度检查直接比对该字段。

补充的生产语义（来自 aster-api 源码与 Action Guard 文档，演示须一致）：

- 评估出错 → `DENY`，`reasonCode: "evaluation_failed"`；返回值不是 Verdict → `DENY`，`reasonCode: "not_a_verdict"`。
- `aster-guard` MCP 代理：工具名 → `action`，工具参数（去掉 null）→ `context`；DENY 返回工具错误
  `Blocked by Aster Guard: <reason> (decision <id>)`；PENDING 最长等待 `--approval-timeout`（默认 300 秒）。
- ESCALATE 没有指定审批角色（任一非请求方审批人可处理）；REQUIRE_APPROVAL 指定角色。
- 证据事件类型：`ACTION_GUARD_DECISION`（`success` 仅 ALLOW 为 true）、`ACTION_GUARD_APPROVAL`
  （无审批人时如过期由 `SYSTEM` 发起；`success` 仅 APPROVED 为 true）。
- 嵌入路由放在 `[locale]` 段之外（`src/app/embed/guardian/[locale]/`），自带最小 layout，
  中间件 matcher 排除 `embed`——`[locale]/layout.tsx` 会给所有页面加站点头尾。

## 1. 目标与受众

为已上线的 AI 治理能力（Action Guard 拦截 AI 代理动作 → ALLOW / DENY / REQUIRE_APPROVAL /
ESCALATE → 四眼审批 → 证据链 → 同一规则导出 Cedar）提供可视化演示，两个站点各司其职：

| 站点 | 受众 | 形态 |
|---|---|---|
| aster-lang.cloud | 潜在客户 / 决策者 | **视图 B「流水线」**：自动播放的剧情，展示四种裁决、两种审批结局与不断增长的证据链 |
| aster-lang.dev | 评估语言的开发者 | **视图 A「三栏舞台」**：可动手的沙盒，可改规则、触发动作、扮演审批人 |
| aster-lang.dev（AI 原生） | 用 MCP 接入代理的构建者 | **视图 C「代理对话」**：助手发起 MCP 工具调用，被 `aster-guard` 代理逐个拦截 |

成功标准：

1. 三个视图里的裁决全部由真实引擎（`@aster-cloud/aster-lang-ts/browser` 的 `compile` + `evaluate`）在浏览器中算出，不是脚本写死的结果。
2. 证据块的哈希与 aster-api `AuditHashPayload` v2 逐字节一致（共享黄金向量双向锁定）。
3. Cedar 面板展示的是真实 aster-api 导出的结果，规则源一旦变化而快照未更新，aster-dev CI 失败。
4. 审批语义与生产一致：请求方不能自批；拒绝必须附说明；过期视为 DENY。
5. 不新增任何后端端点；两个站点保持静态/无服务端依赖（演示部分）。

非目标：真实的 cloud 演示租户、公开的 Cedar 导出端点、在浏览器里运行 Cedar 引擎、新增 E2E 框架。

## 2. 关键约束（来自代码现状）

- 浏览器端 `evaluate`（aster-lang-ts `src/core/interpreter.ts:219`，选项仅 `maxSteps`）**不返回 trace**；
  playground 的 trace 来自 cloud 端点 `/api/playground/evaluate-source`。本演示不依赖该端点：
  「命中的规则行」由裁决种类 + 理由文本反查规则源中对应 `When` 分支得到。
- Cedar 导出（`CedarExportService` / `CedarEngine`，cedar-java）与审计哈希链（`AuditChainAppender`、
  `AuditHashPayload`）只存在于 Java 的 aster-api，经 HMAC 签名访问，不公开。
- cloud API key 映射为单用户租户，真实四眼审批在 cloud key 下无法完成——这是不做「真实演示租户」的原因之一。
- aster-dev 当前不发送任何 framing 头（`src/middleware.ts` 只做 locale 路由），可被 iframe 嵌入；
  aster-cloud 的 CSP `frame-src`（`src/lib/security/csp.ts:195`）需要放行 `https://aster-lang.dev` 才能显示嵌入。
- aster-dev 已有 `/demos` 体系（kitten / poker / jingyesi / sherlock），模式为
  `page.tsx` + `*-content.tsx` + 场景组件 + `use-*-loop` 钩子，纯客户端 compile/evaluate。

## 3. 方案选择

采用「**aster-dev 单一实现，cloud 以 iframe 嵌入剧情模式**」：

- 规则、快照、证据算法、i18n 只有一份，快照新鲜度检查只需在一个仓库维护。
- 备选「复制到 cloud」会重复约 1000 行并持续漂移（kitten/poker 已有先例）；
  「抽成共享 npm 包」引入发布管线与版本钉，对演示过重。均不采用。
- 代价：cloud 需放行 `frame-src`；主题与语言经查询参数传递；嵌入仅在 SaaS 部署出现（`IS_SAAS` 门控），
  on-prem 可能无法访问 aster-lang.dev。

## 4. 架构与组件（aster-dev `src/features/guardian/`）

| 单元 | 职责 | 依赖 |
|---|---|---|
| `scenario.ts` | 单一英文规则源 `guard.support`（见 §0）+ 工具调用 → 守卫请求映射 + 剧情节拍定义 | — |
| `engine.ts` | 规则只编译一次；`decide(action) → { verdict, reason, ruleLine }`；编辑导致编译失败时保留上一个可用规则并返回诊断 | aster-lang-ts/browser |
| `evidence.ts` | `AuditHashPayload.canonicalV2` 的 TS 移植 + WebCrypto SHA-256；`append(entry) → { prevHash, hash }` | — |
| `snapshots/cedar.json` | 真实 aster-api 生成的 Cedar 输出，含 `sourceHash`、`ruleId`、`probes`、`policies`、`schemaText`、`generatedAt` | 生成脚本 |
| `use-guardian.ts` | 状态机：idle → 守卫检查 → 裁决 → 待审批（倒计时）→ 批准 / 拒绝 / 过期 → 执行 / 阻断 | engine、evidence |
| `views/stage.tsx`（A） | 三栏：代理对话 · 守卫闸门 · 规则/证据/Cedar 标签页 + 独立审批人面板 | use-guardian |
| `views/pipeline.tsx`（B） | 每个动作作为卡片沿 代理 → 守卫 → 审批 → 结果 流动；下方证据链逐块增长；独立审批人泳道 | use-guardian |
| `views/agent.tsx`（C） | 助手对话 + 可折叠工具调用卡片，`aster-guard` 内联显示检查与裁决 + 审批人面板 | use-guardian |
| `director.ts` | 剧情自动播放：定时节拍、暂停 / 重放 / 单步；`prefers-reduced-motion` 下以单步模式启动 | use-guardian |

路由（aster-dev）：

- `/[locale]/demos/guardian`：默认视图 A；`?view=agent` 切换为视图 C；规则可编辑。加入 demos 索引卡片。
- `/embed/guardian/[locale]?theme=light|dark`：视图 B + director，无站点头尾，`noindex`（路由位于 `[locale]` 段之外，见 §0）。

aster-cloud 仅新增：

- `/[locale]/demos/guardian` 页面（嵌入 iframe + 「亲手试试 →」链接到 dev 沙盒）与 demos 索引卡片；
- 落地页一个区块：静态海报图占位（≤ 60 KB WebP），区块即将进入视口时才创建 iframe；
- 两者均受 `IS_SAAS` 门控；CSP `frame-src` 加入 `https://aster-lang.dev`。

## 5. 剧情与审批流

规则（`guard.support`，见 §0）：主体角色含 `suspended` → DENY；`delete_customer_record` → REQUIRE_APPROVAL（数据保护官）；
`issue_refund` 且 `context.amount ≥ 10000` → ESCALATE；其余 → ALLOW。工具名即 `req.action`，工具参数即 `req.context`。

### 5.1 cloud 剧情（视图 B，约 50 秒，循环）

| # | 客户 | 代理工具调用 | 守卫 | 审批人泳道 | 结果与证据 |
|---|---|---|---|---|---|
| 1 | 「我 €40 的订单到货就坏了。」 | `issue_refund(40)` | ALLOW | — | 已退款 · 块 #1 |
| 2 | 「顺便把发票 INV-77 的 €12,000 也退了。」 | `issue_refund(12000)` | ESCALATE「large refund」 | 审批人**拒绝**，说明「发票尚未交付」 | 代理告知「审核人已拒绝」· #2 决策、#3 拒绝 |
| 3 | 「删除我的账户和全部数据。」 | `delete_customer_record(cust_8812)` | REQUIRE_APPROVAL（数据保护官） | Dana（DPO）**批准** | 记录已删除 · #4 决策、#5 批准 |
| 4 | （另一个已暂停账户）「退 €10。」 | `issue_refund(10)` | DENY「suspended principal」 | — | 阻断，工具错误回传代理 · #6 |
| 尾 | 同一规则的 Cedar 输出 + 「亲手试试 →」 | | | | |

### 5.2 dev 沙盒（视图 A / C）

- 请求方：每个工具一个按钮、退款金额滑块、「已暂停」开关。请求方一侧**没有**批准按钮。
- 审批人面板（Dana，DPO）：待审批列表，批准 / 拒绝（必须填写说明）/「⏩ 让它过期」。
- 过期时长：生产默认 24 小时；演示显示「演示：60 秒 · 生产：24 小时」，过期后按生产语义视为 DENY。
- 每次守卫决策、每次批准 / 拒绝 / 过期都追加一个证据块（真实 v2 哈希）。
- 编辑规则：裁决实时重算并保持命中行高亮；编译失败显示诊断，演示继续使用上一个可用规则；
  规则源与快照不一致时，Cedar 面板标注「此为内置规则的导出结果」。
- 视图 C：待审批期间工具调用卡片显示「⏳ 被 aster-guard 挂起（approval-timeout 300 秒）」，与真实代理的
  `--approval-timeout` 参数一致；结束后模型收到工具结果或错误。

## 6. 快照、新鲜度与 i18n

### 6.1 Cedar 快照

- 生成脚本 `scripts/guardian-snapshots.mjs`（aster-dev 没有 Cedar 引擎，必须新增；手动运行，不进构建）：
  对单一英文规则源调用本地 aster-api `POST /api/v1/policies/export/cedar`（`CedarExportResource`），
  以 `Authorization: Bearer <本地 API key>` 认证（`ASTER_API_URL` / `ASTER_API_KEY` 环境变量）。
- 断言 `exportable=true`、`probes.agreed === probes.count`、`sourceHash === sha256(规则源)`，否则生成失败。
- `package.json` 增加 `guardian:snapshots` 脚本条目。

### 6.2 证据哈希

- `evidence.ts` 按 `canonicalV2` 的固定字段顺序与长度前缀编码 `name:len:value\n`（`null` 为 `-1`，空串为 `0`）。
- 长度必须按 **UTF-16 码元**计算（Java `String.length()` 与 JS `.length` 一致），不能用 UTF-8 字节数，
  否则非 ASCII 理由文本的哈希会不一致。
- 演示时间戳取整秒，并按 Java `Instant.toString()` 格式输出。
- 在 **aster-api** 新增 `AuditHashPayloadVectorsTest`，钉住 4 个黄金向量（创世块、链式块、非 ASCII 理由、
  null 与空串区分）；aster-dev 的 `evidence.test.ts` 使用相同向量。任一侧漂移，各自 CI 失败。

### 6.3 新鲜度检查（aster-dev CI，无网络）

`guardian-snapshots.test.ts` 由 `scenario.ts` 重算 `sha256(规则源)`，与 `snapshots/cedar.json` 的 `sourceHash` 比对；
不一致时失败并提示「规则已变更——请对本地 aster-api 运行 `pnpm guardian:snapshots`」。

### 6.4 i18n

- aster-dev：新命名空间 `guardianDemo`（en / zh / de / hi，hi 为天城文，受现有一致性测试约束），含剧情台词。
- aster-cloud：仅落地区块、demos 卡片、`/demos/guardian` 页面文案（4 种语言，`check:message-keys` 检查）；
  iframe 的 `locale` 取自 cloud 页面，缺省回退 en。

## 7. 测试

单元测试（vitest，aster-dev）：

- `engine`：4 种裁决 + 金额边界（9999 / 10000）+ 缺少 context 键 → `evaluation_failed` DENY；裁决 → 命中行映射；编译失败时保留上一个可用规则。
- `evidence`：共享黄金向量；6 个块的链接正确性。
- `use-guardian`：批准 → 执行；无说明拒绝被拒绝；有说明拒绝 → 阻断；过期 → DENY；请求方无审批动作；
  每次决策与每次审批事件各一个证据块。
- `director`：假定时器下节拍时间线确定；暂停 / 重放 / 单步；减少动态效果时为单步模式。
- 新鲜度：`sourceHash` 与 `sha256(规则源)` 一致；快照 `exportable` 且 probes 全部一致。

渲染矩阵（本地，真实浏览器）：3 个视图 × 4 种语言 × 明暗主题 + 375 px 移动宽度；截图留证，
无控制台错误、无 hydration 警告。aster-dev 不新增 E2E 框架。

aster-cloud：一个 Playwright 用例——SaaS 模式下 `/demos/guardian` 渲染 iframe 且到达第一个节拍；
`IS_SAAS=false` 时区块不存在。单元测试覆盖 CSP `frame-src` 与消息键。

aster-api：`AuditHashPayloadVectorsTest`。

## 8. 性能与无障碍

- cloud 落地页：Lighthouse 性能分相对改动前基线下降 **≤ 2 分**，LCP 不变（海报占位 + 延迟创建 iframe）。
- aster-dev `/demos/guardian`：复用其他 demo 已加载的 `aster-lang-ts/browser` chunk；新增路由代码 **≤ 35 KB gzip**；
  规则编译 **≤ 50 ms**（中档笔记本），单次评估 < 5 ms。
- 动画仅用 transform / opacity。
- 剧情是持续超过 5 秒的动态内容，提供可见的**暂停**控件（WCAG 2.2.2）；`prefers-reduced-motion` 下默认暂停。
- 裁决经 `aria-live="polite"` 播报；每种裁决有文字标签而非仅靠颜色；全部控件可键盘操作。
- `/demos/guardian`（两站）提供 metadata 与 OG；嵌入路由 `noindex`。

## 9. 风险

| 风险 | 缓解 |
|---|---|
| 规则改动后忘记重新生成 Cedar 快照 | CI 新鲜度检查失败并给出命令 |
| 哈希移植与 Java 漂移 | 两仓共享黄金向量 |
| 「命中行」反查在用户大幅改写规则后失效 | 失效时不高亮，裁决仍正确显示；不报错 |
| iframe 在 cloud 落地页拖慢首屏 | 海报占位 + 进入视口前不创建 + Lighthouse 预算 |
| 演示与生产语义偏离（审批、过期） | 状态机测试锁定：不可自批、拒绝需说明、过期即 DENY；演示时长明确标注 |
| on-prem 无法访问 aster-lang.dev | `IS_SAAS` 门控，on-prem 不显示嵌入 |

## 10. 交付顺序

1. aster-api：`AuditHashPayloadVectorsTest`（向量来源）。
2. aster-dev：scenario / engine / evidence / snapshots + 新鲜度测试 → 状态机 → 视图 A → 视图 C → 视图 B + director + 嵌入路由 → i18n → 渲染矩阵。
3. aster-cloud：CSP `frame-src`、`/demos/guardian`、demos 卡片、落地区块、Playwright 用例。
