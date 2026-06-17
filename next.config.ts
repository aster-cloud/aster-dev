import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

// next-intl 插件：把 src/i18n/request.ts 作为 getRequestConfig 入口。
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// MDX 插件：文档正文用 MDX（Phase 3 把 VitePress 的 md 迁过来）。
// remark-gfm = 表格/删除线；rehype-slug = 标题自动生成 id（站内锚点）。
// Turbopack 要求 plugin 用字符串名（不能序列化函数实例）。
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [['rehype-slug']],
  },
});

const nextConfig: NextConfig = {
  // 文档站正文用 MDX（Phase 3 把 VitePress 的 md 迁过来）。
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
  // 显式钉死 workspace root，消除"检测到多个 lockfile"的推断警告
  // （~/package-lock.json 干扰）。指向本项目目录。
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
};

export default withNextIntl(withMDX(nextConfig));
