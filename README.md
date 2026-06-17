# aster-dev

aster-lang.dev 文档站的 **Next.js 重写**（ADR 0018 统一语言包 Phase 3）。

替换原 VitePress 站（`aster-lang-dev`），统一到与 `aster-cloud` 相同的技术栈：
**Next.js 16 (App Router) + next-intl + 运行时 ui-messages 加载**。

## 为什么重写

ADR 0018 要把"界面显示语言 + 策略编写语言"统一进一套可热插拔的语言包。
P0-P2 已让 `aster-cloud` 的界面文案改为**运行时**从后端 `/api/v1/messages` 加载
（后端加语言 → 前端无需重部署即显示）。本站复用同一机制，让文档站也吃到统一语言包。

## 当前状态：第一里程碑（脚手架 + PoC）

这是**滚动迁移**的第一步，证明路线可行，不是完整迁移：

- ✅ Next.js 16 App Router 骨架 + `[locale]` 路由 + next-intl 中间件
- ✅ 运行时 messages 加载（`src/i18n/messages-loader.ts`，复用 cloud P2 的 fail-open 模式：后端 → 内嵌兜底）
- ✅ 首页（从 VitePress `docs/index.md` hero 迁移，4 locale，文案走 next-intl）
- ✅ 文档页 PoC（`content/<locale>/quickstart.mdx`，证明"每 locale 一套 MDX"路由）
- ✅ **AsterPlayground React PoC**（`AsterPlayground.vue` 1074 行 → React + CodeMirror，
  编译/执行仍走后端 `/api/v1/policies/evaluate-source`，保持可信执行链）

### 后续里程碑（独立 PR）

- ⬜ 批量迁移剩余 63 篇文档（md → mdx，含 zh/de/hi locale）
- ⬜ 移植剩余 9 个 Vue 组件（HeroAnimation、DevFooter、HeroTaglineList 等）
- ⬜ AsterPlayground 全功能（多示例、语法高亮、trace 面板、AI 解释）
- ⬜ 语言切换器接后端 `/api/v1/lexicons` 可用性约束（与 cloud 四重交集同源）
- ⬜ next-intl `pathnames` 本地化 URL
- ⬜ glossary locale-parity 门去留 + 切换/回退 + 退役旧 VitePress 站

## 开发

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm build
```

后端地址通过 `NEXT_PUBLIC_ASTER_POLICY_API_URL` 配置（默认 `https://policy.aster-lang.dev`）。

## 结构

```
src/
  app/[locale]/         App Router locale 段（layout/page/docs/playground）
  i18n/                 config / routing / request / navigation / messages-loader
  components/           AsterPlayground 等（Vue→React 移植）
content/<locale>/       文档正文 MDX（每 locale 一套）
messages/<locale>.json  内嵌界面文案兜底（运行时优先后端 /api/v1/messages）
```
