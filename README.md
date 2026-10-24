# aster-dev

aster-lang.dev 文档站的 **Next.js 重写**（ADR 0018 统一语言包 Phase 3）。

替换原 VitePress 站（`aster-lang-dev`），统一到与 `aster-cloud` 相同的技术栈：
**Next.js 16 (App Router) + next-intl + 运行时 ui-messages 加载**。

## 为什么重写

ADR 0018 要把"界面显示语言 + 策略编写语言"统一进一套可热插拔的语言包。
P0-P2 已让 `aster-cloud` 的界面文案改为**运行时**从后端 `/api/v1/messages` 加载
（后端加语言 → 前端无需重部署即显示）。本站复用同一机制，让文档站也吃到统一语言包。

## 当前状态

本站已上线：aster-lang.dev 由本仓库构建的 Cloudflare Worker 提供（见 [DEPLOY.md](DEPLOY.md)），
旧 VitePress 站仓库 `aster-cloud/aster-lang-dev` 已归档只读。

### 设计系统（与 aster-cloud 同一真相源）
- `@aster-cloud/tokens` 品牌 token：色阶 / 语义角色 / 字体栈 / 圆角 / 阴影 / 动效。Tailwind v4 `@theme inline` 桥接，组件写 `bg-primary` / `text-fg-muted` / `font-display`。
- `@aster-cloud/ui` 共享组件。
- 自托管字体 **Fraunces**（display）/ **Inter**（sans）/ **JetBrains Mono**（code），经 `next/font/google`。
- 暗色模式（next-themes，`data-theme` 属性，对齐 tokens 的 `[data-theme="dark"]`）。

### 内容
- 文档：`content/<locale>/*.mdx` 共 14 篇（quickstart、overview、language-guide、reference、stdlib、lexicons、browser-api、deployment、editions、governance、action-guard、evidence、cedar-export、ai-assist）。en / zh 齐全；de / hi 目前只有 quickstart，其余页面回落英文并显示"尚未翻译"提示。
- 博客：`content/blog/*.mdx`（仅英文），元数据在 `src/lib/blog.ts`。列表 `/blog`，文章 `/blog/posts/<slug>`，RSS `/blog/feed.xml`。
- Playground 与演示：`/playground`、`/demos/*`，以及供外站嵌入的 `/embed/guardian/<locale>`。

### 多语言
- 四个 locale：en / zh / de / hi（`src/i18n/config.ts`），`localePrefix: 'as-needed'`，英文不带前缀。
- 界面文案以内嵌 `messages/<locale>.json` 为基底，运行时可被后端 `/api/v1/messages` 覆盖（`src/i18n/messages-loader.ts`，fail-open）。四个 locale 的键集合由 `src/i18n/locale-parity.test.ts` 强制一致。

### 旧站 URL
旧站的路径（`/learn/*`、`/editions/`、`/pricing/*`、`/community/lexicons`，以及已迁往 aster-lang.cloud 的 `/api/*`、`/getting-started/*`、`/graphql/*`、`/websocket/*`）由 `src/config/legacy-redirects.ts` 按四个 locale 统一 308 到新地址。旧站的社区页与合规页（`/community/*`、`/community/compliance/*`、`/enterprise`）尚无新去处，登记在同一文件的 `UNMIGRATED` 中。

### 待办
- 迁移旧站社区与合规页面，迁入后从 `UNMIGRATED` 移除并补重定向规则。
- 补齐 de / hi 文档翻译。
- next-intl `pathnames` 本地化 URL。

## 开发

> **要求**：Node.js ≥ 24（`package.json` `engines`），pnpm 10.28（`packageManager` 钉死，`corepack enable` 后自动使用）。

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

后端地址通过 `NEXT_PUBLIC_ASTER_POLICY_API_URL` 配置（默认 `https://policy.aster-lang.dev`）。

## 部署

推到 `main` 后由 `.github/workflows/deploy.yml` 经 OpenNext 构建并 `wrangler deploy` 到 Cloudflare Workers；也可手动触发。凭证与域名切换见 [DEPLOY.md](DEPLOY.md)。

## 结构

```
src/
  app/[locale]/         页面：首页、docs/、blog/、playground/、demos/
  app/embed/            供外站嵌入的页面（不走 locale 前缀重写）
  app/blog/feed.xml/    RSS 路由（带扩展名，不经 next-intl 中间件）
  config/               演示配置、旧站重定向表
  features/guardian/    Guardian 演示的状态机与剧本
  i18n/                 locale 配置 / 路由 / messages 加载
  components/ lib/ hooks/ content/
content/<locale>/       文档正文 MDX
content/blog/           博客正文 MDX
messages/<locale>.json  内嵌界面文案（运行时可被后端覆盖）
scripts/                构建期脚本（文档搜索索引等）
```
