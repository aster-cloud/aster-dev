import { describe, expect, it } from 'vitest';
import { isBuiltInSource } from './cedar-source';
import { GUARD_SOURCE } from './scenario';

describe('isBuiltInSource', () => {
  it('原样或仅行尾空白差异 → 内置', () => {
    expect(isBuiltInSource(GUARD_SOURCE)).toBe(true);
    expect(isBuiltInSource(GUARD_SOURCE.replace(/\n/g, '  \n'))).toBe(true);
  });
  it('任何实质改动 → 非内置（Cedar 面板须标注）', () => {
    expect(isBuiltInSource(GUARD_SOURCE.replace('10000', '5000'))).toBe(false);
  });
});
