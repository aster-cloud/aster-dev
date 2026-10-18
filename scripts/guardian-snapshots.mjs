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
