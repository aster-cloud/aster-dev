import { GUARD_SOURCE } from './scenario';

/** 当前规则源是否就是生成 Cedar 快照的内置规则（忽略行尾空白）。 */
const normalize = (s: string) => s.split('\n').map((l) => l.trimEnd()).join('\n').trim();
const BUILT_IN = normalize(GUARD_SOURCE);

export function isBuiltInSource(source: string): boolean {
  return normalize(source) === BUILT_IN;
}
