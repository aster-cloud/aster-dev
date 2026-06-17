# aster-dev

aster-lang.dev 文档站的 **Next.js 重写**（ADR 0018 统一语言包 Phase 3）。

替换原 VitePress 站（`aster-lang-dev`），统一到与 `aster-cloud` 相同的技术栈：
**Next.js 16 (App Router) + next-intl + 运行时 ui-messages 加载**。

## 为什么重写

ADR 0018 要把"界面显示语言 + 策略编写语言"统一进一套可热插拔的语言包。
P0-P2 已让 `aster-cloud` 的界面文案改为**运行时**从后端 `/api/v1/messages` 加载
（后端加语言 → 前端无需重部署即显示）。本站复用同一机制，让文档站也吃到统一语言包。

## 当前状态：脚手架 + 设计系统重设计

**滚动迁移**的前两步，证明路线可行 + 像素级对齐 aster-cloud，不是完整迁移：

### 设计系统（与 aster-cloud 同一真相源）
- ✅ `@aster-cloud/tokens`（官方"shared with aster-lang-dev"）品牌 token：色阶 / 语义角色 / 字体栈 / 圆角 / 阴影 / 动效。Tailwind v4 `@theme inline` 桥接 → 组件写 `bg-primary` / `text-fg-muted` / `font-display`。
- ✅ 自托管字体 **Fraunces**（display）/ **Inter**（sans）/ **JetBrains Mono**（code）via `next/font/google`。
- ✅ **暗色模式**（next-themes，`data-theme` 属性，对齐 tokens 的 `[data-theme="dark"]`）。

### 信息架构（语言规范标准章节）
- ✅ 站点 chrome：sticky 毛玻璃 header（logo + 导航 + 语言切换器 + 主题切换 + GitHub）+ 简洁 footer。
- ✅ docs 三栏：左分组导航（Getting Started → Language Guide → Reference）+ prose 正文。
- ✅ 文档：`quickstart` + `language-guide`（语法/类型/表达式/规则/模块）+ `reference`（语法/运算符/求值/纯度）。en/zh 全译，de/hi 缺失 fallback en。

### 代码优先 Hero（现代语言官网标配）
- ✅ 左价值主张 + CTA，右真实 Aster 规则代码块（`CodeBlock`：JetBrains Mono + token 着色 + 复制，XSS-safe）。三大价值 + 受众分流。
- ✅ **AsterPlayground React**（`AsterPlayground.vue` 1074 行 → React + CodeMirror，编译/执行走后端 `/api/v1/policies/evaluate-source`，保持可信执行链）。

### i18n
- ✅ 运行时 messages 加载（`src/i18n/messages-loader.ts`，复用 cloud P2 fail-open：后端 → 内嵌兜底）。`devNav`/`devFooter`/`devSite`/`docsNav` namespace 改文案无需重构建。

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
