'use client';

import { useEffect, useState } from 'react';
import { locales, type Locale } from '@/i18n/config';

/**
 * 后端可用 locale 约束（ADR 0018 Phase 3）。
 *
 * 拉 aster-api /api/v1/lexicons（已注册 + 未软下线 = 后端可用性层），与编译期
 * locales 求交 → 语言切换器只显示"既编译支持、后端又启用"的语言。与 aster-cloud
 * 的四重交集同源（这里取 compiled∩backend 两层；platform∩team 是 cloud 登录态特性）。
 *
 * fail-open：fetch 失败时回退到编译期全集（绝不让切换器空掉，宁可多显示）。
 */
const API_BASE =
  process.env.NEXT_PUBLIC_ASTER_POLICY_API_URL || 'https://policy.aster-lang.dev';

/** 后端全码 → cloud 短码。 */
const FULL_TO_SHORT: Record<string, Locale> = {
  'en-US': 'en',
  'zh-CN': 'zh',
  'de-DE': 'de',
  'hi-IN': 'hi',
};

export function useAvailableLocales(): { available: Locale[]; loading: boolean } {
  const [available, setAvailable] = useState<Locale[]>([...locales]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/api/v1/lexicons`, { headers: { Accept: 'application/json' } })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((list: { id: string }[]) => {
        if (!alive) return;
        const backendShort = new Set(
          list.map((x) => FULL_TO_SHORT[x.id]).filter((x): x is Locale => Boolean(x)),
        );
        // compiled ∩ backend
        const intersected = locales.filter((l) => backendShort.has(l));
        // fail-open：若交集为空（后端异常返回），保留编译期全集。
        setAvailable(intersected.length > 0 ? intersected : [...locales]);
      })
      .catch(() => {
        // fail-open：保留编译期全集。
        if (alive) setAvailable([...locales]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { available, loading };
}
