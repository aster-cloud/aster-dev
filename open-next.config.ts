import type { OpenNextConfig } from '@opennextjs/cloudflare';

/**
 * OpenNext Cloudflare 适配（与 aster-cloud 同款）：把 Next.js 16 部署到
 * Cloudflare Workers（非 Pages）。aster-dev 是文档站、无 DB/队列，缓存用 dummy。
 * proxy（next-intl 中间件）作为 edge worker external 跑。
 */
const config: OpenNextConfig = {
  default: {
    override: {
      wrapper: 'cloudflare-node',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
  edgeExternals: ['node:crypto'],
  middleware: {
    external: true,
    override: {
      wrapper: 'cloudflare-edge',
      converter: 'edge',
      proxyExternalRequest: 'fetch',
      incrementalCache: 'dummy',
      tagCache: 'dummy',
      queue: 'dummy',
    },
  },
};

export default config;
