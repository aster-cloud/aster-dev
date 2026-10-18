import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import cedar from './snapshots/cedar.json';
import { GUARD_MODULE, GUARD_SOURCE, RULE_ID } from './scenario';

describe('Cedar 快照新鲜度', () => {
  it('快照对应当前规则源（规则改动后须重新生成）', () => {
    const hash = createHash('sha256').update(GUARD_SOURCE).digest('hex');
    expect(cedar.sourceHash, '规则已变更——请对本地 aster-api 运行 `pnpm guardian:snapshots`').toBe(hash);
  });

  it('快照可导出且全部探针一致', () => {
    expect(cedar.exportable).toBe(true);
    expect(cedar.probes.count).toBeGreaterThan(0);
    expect(cedar.probes.agreed).toBe(cedar.probes.count);
    expect(cedar.ruleId).toBe(RULE_ID);
    expect(cedar.moduleName).toBe(GUARD_MODULE);
    expect(cedar.policies).toContain('@aster_rule("SUPPORT-001")');
  });
});
