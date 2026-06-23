import { locales, localeNames, type Locale } from '@/i18n/config';

/**
 * 把语言名列表拼成本地化的「A、B、C 或 D」串（heroText 的 {languages} 占位符）。
 *
 * 连接词随 UI locale 变（en="or" / zh="或" / de="oder" / hi="या"，来自
 * heroLanguagesConjunction 键）。纯函数，client 组件（按 compiled∩backend 收敛）
 * 与 server metadata（用 compiled 全集做静态 SEO 描述）共用，避免两处口径漂移。
 */
export function joinLanguages(names: string[], conjunction: string): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  const head = names.slice(0, -1);
  const tail = names[names.length - 1];
  // 两项："A 或 B"；多项："A、B、C 或 D"（顿号分隔前段，连接词接最后一项）。
  return `${head.join('、')} ${conjunction} ${tail}`;
}

/** compiled 全集（en/zh/de/hi 编译期顺序）的语言名 join——用于静态 SEO 描述。 */
export function allLanguagesLabel(conjunction: string): string {
  return joinLanguages(
    locales.map((l) => localeNames[l as Locale]),
    conjunction,
  );
}
