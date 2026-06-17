import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { loadMessages } from './messages-loader';
import { defaultLocale, type Locale } from './config';

type MessageTree = Record<string, unknown>;

/**
 * Deep-merge `override` 树到 `base` 之上（与 aster-cloud deepMergeMessages 同款）。
 *
 * 仅在 override 提供非空字符串值或非空子树时覆盖；缺失的 key 落回 base（en）。
 * 这是部分翻译 locale（如 hi 仅 ~7%）不报 MISSING_MESSAGE 的关键——浅合并会让
 * `hi.devSite` 整个替换掉 `en.devSite`，丢掉未翻译的子键。
 */
export function deepMergeMessages(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    const b = result[key];
    if (
      o !== null &&
      typeof o === 'object' &&
      !Array.isArray(o) &&
      b !== null &&
      typeof b === 'object' &&
      !Array.isArray(b)
    ) {
      result[key] = deepMergeMessages(b as MessageTree, o as MessageTree);
    } else if (typeof o === 'string') {
      // 空串 / 纯空白视为"未翻译"，保留 base。
      if (o.trim().length > 0) result[key] = o;
    } else if (o !== undefined && o !== null) {
      result[key] = o;
    }
  }
  return result;
}

/**
 * next-intl 请求配置（ADR 0018 Phase 3）。
 *
 * messages 走 loadMessages 运行时加载（后端 → 内嵌兜底），非默认 locale 深合并
 * 叠加在 en 之上，缺失 key 自动落 en。fail-open，绝不白屏。
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const fallback = await loadMessages(defaultLocale);
  const localeMessages =
    locale === defaultLocale ? fallback : await loadMessages(locale as Locale);

  const messages =
    locale === defaultLocale ? fallback : deepMergeMessages(fallback, localeMessages);

  return { locale, messages };
});
