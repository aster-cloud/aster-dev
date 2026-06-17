# 部署到 Cloudflare（替换 aster-lang.dev）

aster-dev 是 Next.js 16（含 SSR/middleware），经 **OpenNext** 适配部署到
**Cloudflare Workers**（与 aster-cloud 同款），替换旧的 Cloudflare **Pages** 站
（`aster-lang-dev` 项目）。

## 现状（已验证，本地）

- ✅ `pnpm exec opennextjs-cloudflare build` 成功（`.open-next/worker.js` + 45 assets）
- ✅ `pnpm exec wrangler deploy --dry-run` 通过（ASSETS 绑定 + env 正确，~3MB gzip）
- ⏳ 实际 `wrangler deploy` + DNS cutover 需要 CF 凭证（下方）

## 一次性准备：凭证

部署需要 Cloudflare API token（不能用我手里的——wrangler 未登录）。两种方式：

### A. 本地手动部署（最快验证）

```bash
cd ~/IdeaProjects/aster-dev
wrangler login          # 交互式浏览器登录（一次）
pnpm run deploy         # = opennextjs-cloudflare build && opennextjs-cloudflare deploy
```

### B. CI 自动部署（推荐，已配 .github/workflows/deploy.yml）

在 GitHub repo Settings → Secrets 加：

- `CLOUDFLARE_API_TOKEN` —— 权限含 **Workers Scripts:Edit** + **Workers Routes:Edit**
  + **Account Settings:Read**（建 Worker + 绑自定义域名需要）。
- `CLOUDFLARE_ACCOUNT_ID` —— CF dashboard 右侧栏的 Account ID。

推到 `main` 即自动 typecheck + lint + OpenNext build + `wrangler deploy`。

## 域名 cutover（替换 aster-lang.dev）

`wrangler.jsonc` 的 `routes` 已声明自定义域名：

```jsonc
"routes": [
  { "pattern": "aster-lang.dev", "custom_domain": true },
  { "pattern": "www.aster-lang.dev", "custom_domain": true }
]
```

首次 `wrangler deploy` 时，Cloudflare 会：

1. 创建/更新 `aster-dev` Worker。
2. 把 `aster-lang.dev` + `www.aster-lang.dev` 自定义域名**指向新 Worker**——
   自动接管旧 Pages 站的流量（custom domain 是排他的，新绑定即顶替旧的）。

> ⚠️ 若 `aster-lang.dev` 当前作为 **Pages 自定义域名**绑在旧 `aster-lang-dev` 项目，
> Cloudflare 在把它绑到 Worker 时会要求先从 Pages 项目解绑。若 `wrangler deploy`
> 报域名冲突：CF dashboard → Pages → `aster-lang-dev` → Custom domains → 删除
> `aster-lang.dev`，再重跑 deploy。DNS 记录（CNAME/A）由 CF 托管，custom_domain
> 模式会自动维护，无需手动改 DNS。

## 退役旧站

cutover 确认新站正常后：

- 旧 repo `aster-lang-dev` 的 `deploy.yml`（Pages）可停用/删除，避免它重新抢占域名。
- 旧 Pages 项目 `aster-lang-dev` 可保留一段时间作回退，确认稳定后再删。

## 回退

新站若有问题，重新把 `aster-lang.dev` 自定义域名绑回旧 Pages 项目即可（CF dashboard
→ Pages → aster-lang-dev → Custom domains → 添加），分钟级回退。

## 验证清单（部署后）

- [ ] `https://aster-lang.dev/` 200，渲染新首页（代码优先 hero）
- [ ] `https://aster-lang.dev/zh`、`/de`、`/hi` 本地化正确
- [ ] `https://aster-lang.dev/playground` 全功能（高亮/模板/trace/分享）
- [ ] `https://aster-lang.dev/docs/reference` 等文档页正常
- [ ] 暗色切换、语言切换器工作
- [ ] playground Run 能打到 `policy.aster-lang.dev`（CORS/CSP 放行）
