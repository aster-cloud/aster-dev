import { describe, expect, it } from 'vitest';
import { buildChain, canonicalV2, javaInstant, sha256Hex, type AuditFields } from './evidence';

// 与 aster-api AuditHashPayloadVectorsTest 逐字相同的黄金向量。
const V1 = '52072f98c77244cca47abd2eea21dee4d2354a9eb9636884a2e6ad9789fac724';
const V2 = '98536dd23f36d57b63547be50dd70c9e617152491d0bd8d7fa6dce85e3bbd239';
const V3 = '882fcb4d75425715649efe36df3aaa660c416a0489614f42b3c6918b55b91c54';
const V4 = '6131ac2cfef032dd5fe783d140bd47f061fde3f5568c98785f05331dd12ef8e3';

const decision = (prevHash: string | null, timestamp: string, success: boolean, metadata: string): AuditFields => ({
  prevHash, eventType: 'ACTION_GUARD_DECISION', timestamp, tenantId: 'demo', performedBy: 'support-bot',
  policyModule: 'guard.support', policyFunction: 'decide', toVersion: 1, success, metadata,
});
const v1 = decision(null, '2026-10-18T09:00:00Z', true, '{"outcome":"ALLOW","ruleId":"SUPPORT-001","actionName":"issue_refund"}');
const v2 = decision(V1, '2026-10-18T09:00:05Z', false, '{"outcome":"REQUIRE_APPROVAL","ruleId":"SUPPORT-001","actionName":"delete_customer_record"}');
const v3: AuditFields = {
  prevHash: V2, eventType: 'ACTION_GUARD_APPROVAL', timestamp: '2026-10-18T09:01:00Z', tenantId: 'demo',
  performedBy: 'dana', success: true, reason: '数据保护官已批准 — Löschung ✓ 🛡',
  metadata: '{"outcome":"APPROVED","requiredRole":"Data Protection Officer"}',
};

describe('canonicalV2 / sha256Hex 与 aster-api 黄金向量一致', () => {
  it('V1 创世块', async () => expect(await sha256Hex(canonicalV2(v1))).toBe(V1));
  it('V2 链式块', async () => expect(await sha256Hex(canonicalV2(v2))).toBe(V2));
  it('V3 非 ASCII：长度按 UTF-16 码元', async () => {
    expect(v3.reason).toHaveLength(24);
    expect(await sha256Hex(canonicalV2(v3))).toBe(V3);
  });
  it('V4 空串与 null 不同', async () => {
    expect(await sha256Hex(canonicalV2({ ...v1, reason: '' }))).toBe(V4);
  });
  it('null 编码为 -1，空串编码为 0:', () => {
    const c = canonicalV2({ ...v1, reason: '' });
    expect(c.startsWith('v2\nprevHash:-1\n')).toBe(true);
    expect(c).toContain('\nreason:0:\n');
  });
});

describe('buildChain', () => {
  it('前两块复现 V1 → V2，且每块 prevHash 指向上一块', async () => {
    const strip = ({ prevHash: _p, ...rest }: AuditFields) => rest;
    const chain = await buildChain([strip(v1), strip(v2), strip(v1), strip(v2), strip(v1), strip(v2)]);
    expect(chain.map((b) => b.index)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(chain[0].prevHash).toBeNull();
    expect(chain[0].hash).toBe(V1);
    expect(chain[1].hash).toBe(V2);
    for (let i = 1; i < chain.length; i++) expect(chain[i].prevHash).toBe(chain[i - 1].hash);
  });
});

describe('javaInstant', () => {
  it('整秒且无毫秒，与 Java Instant.toString 一致', () => {
    expect(javaInstant(Date.UTC(2026, 9, 18, 9, 0, 0, 999))).toBe('2026-10-18T09:00:00Z');
  });
});
