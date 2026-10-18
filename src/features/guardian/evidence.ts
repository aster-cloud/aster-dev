/**
 * 审计证据链：aster-api `AuditHashPayload.canonicalV2` 的逐字节移植。
 *
 * 字段顺序是协议的一部分，不得调整。长度按 UTF-16 码元计算（与 Java `String.length()` 一致），
 * 摘要对 UTF-8 字节做 SHA-256。黄金向量与 aster-api `AuditHashPayloadVectorsTest` 共享。
 */
export type AuditValue = string | number | boolean | null | undefined;

export interface AuditFields {
  prevHash?: AuditValue;
  eventType: string;
  timestamp: string;
  tenantId?: AuditValue;
  performedBy?: AuditValue;
  policyModule?: AuditValue;
  policyFunction?: AuditValue;
  policyId?: AuditValue;
  fromVersion?: AuditValue;
  toVersion?: AuditValue;
  executionTimeMs?: AuditValue;
  success?: AuditValue;
  reason?: AuditValue;
  errorMessage?: AuditValue;
  notes?: AuditValue;
  metadata?: AuditValue;
  clientIp?: AuditValue;
  userAgent?: AuditValue;
}

const FIELD_ORDER: (keyof AuditFields)[] = [
  'prevHash', 'eventType', 'timestamp', 'tenantId', 'performedBy', 'policyModule', 'policyFunction',
  'policyId', 'fromVersion', 'toVersion', 'executionTimeMs', 'success', 'reason', 'errorMessage',
  'notes', 'metadata', 'clientIp', 'userAgent',
];

export function canonicalV2(f: AuditFields): string {
  let c = 'v2\n';
  for (const name of FIELD_ORDER) {
    const v = f[name];
    // null 与空串必须可区分：前者 -1，后者 0。
    c += v === null || v === undefined ? `${name}:-1\n` : `${name}:${String(v).length}:${String(v)}\n`;
  }
  return c;
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

export interface EvidenceBlock {
  index: number;
  fields: AuditFields;
  prevHash: string | null;
  hash: string;
}

export async function buildChain(events: Omit<AuditFields, 'prevHash'>[]): Promise<EvidenceBlock[]> {
  const chain: EvidenceBlock[] = [];
  let prevHash: string | null = null;
  for (const event of events) {
    const fields: AuditFields = { ...event, prevHash };
    const hash = await sha256Hex(canonicalV2(fields));
    chain.push({ index: chain.length + 1, fields, prevHash, hash });
    prevHash = hash;
  }
  return chain;
}

/** 整秒的 Java `Instant.toString()`：演示时间戳一律截到秒，避免毫秒格式差异。 */
export function javaInstant(ms: number): string {
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z');
}
