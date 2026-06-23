'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { locales, localeNames, type Locale } from '@/i18n/config';
import { useAvailableLocales } from '@/hooks/useAvailableLocales';
import { joinLanguages } from '@/lib/hero-languages';

/**
 * Hero 副标题（heroText）。原文把支持的语言列表硬编码进句子里
 * （"…in plain English, 中文, Deutsch or हिन्दी —…"），管理员在后端禁用某语言后
 * 这句不会变。改为 client 组件：把语言列表交给 `{languages}` 占位符，运行时按
 * **compiled∩backend** 实时拼接——与 dev 语言切换器同源（useAvailableLocales）。
 *
 * fail-open：useAvailableLocales 探测失败时返回编译期全集，这句退回完整四语，
 * 绝不让营销页看起来只支持一种语言。
 *
 * 语言名之间用「、」，最后两项之间用本 locale 的连接词（en="or" / zh="或" /
 * de="oder" / hi="या"，由 heroLanguagesConjunction 键提供，译者可控）。
 */
export function HeroText() {
  const t = useTranslations('devSite');
  const { available } = useAvailableLocales();

  const languages = useMemo(() => {
    // 按编译期顺序（en/zh/de/hi）过滤可用集，保持稳定的展示次序。
    const ordered = locales.filter((l) => available.includes(l as Locale));
    const names = (ordered.length > 0 ? ordered : [...locales]).map(
      (l) => localeNames[l as Locale],
    );
    return joinLanguages(names, t('heroLanguagesConjunction'));
  }, [available, t]);

  return <p className="mt-4 text-lg text-fg-muted">{t('heroText', { languages })}</p>;
}
