import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import createMDX from '@next/mdx';

// next-intl 插件：把 src/i18n/request.ts 作为 getRequestConfig 入口。
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// MDX 插件：文档正文用 MDX（Phase 3 把 VitePress 的 md 迁过来）。
const withMDX = createMDX({});

const nextConfig: NextConfig = {
  // 文档站正文用 MDX（Phase 3 把 VitePress 的 md 迁过来）。
  pageExtensions: ['ts', 'tsx', 'md', 'mdx'],
};

export default withNextIntl(withMDX(nextConfig));
