import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * OpenNext Cloudflare 的部署约束。本地 `next start` 与 vitest 都不经过 OpenNext，
 * 这类问题只在 Workers 上暴露（issue #44 的修复曾因此在线上让全部博文 404）。
 *
 * open-next.config.ts 用 `incrementalCache: 'dummy'`：预渲染产物不进缓存，每次请求都要
 * 运行时渲染。路由若 `export const dynamicParams = false`，OpenNext 视其为 fallback:false，
 * 又找不到缓存页，于是一律 404。未知参数应在页面里 notFound()。
 */
const ROOT = process.cwd();
const APP = join(ROOT, 'src/app');

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return routeFiles(p);
    return /^(page|layout|route)\.tsx?$/.test(e.name) ? [p] : [];
  });
}

describe('OpenNext compatibility', () => {
  it('增量缓存是 dummy 时，没有路由声明 dynamicParams = false', () => {
    const config = readFileSync(join(ROOT, 'open-next.config.ts'), 'utf8');
    if (!/incrementalCache:\s*'dummy'/.test(config)) return;
    const offenders = routeFiles(APP).filter((f) =>
      /export\s+const\s+dynamicParams\s*=\s*false/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map((f) => f.slice(ROOT.length + 1))).toEqual([]);
  });
});
