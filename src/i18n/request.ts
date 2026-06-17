import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';
import { loadMessages } from './messages-loader';
import { defaultLocale, type Locale } from './config';

/**
 * next-intl 请求配置（ADR 0018 Phase 3）。
 *
 * 与 aster-cloud 同款：messages 走 loadMessages 运行时加载（后端 → 内嵌兜底），
 * 非默认 locale 叠加在 en 之上，缺失 key 自动落 en。fail-open，绝不白屏。
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const fallback = await loadMessages(defaultLocale);
  const localeMessages =
    locale === defaultLocale ? fallback : await loadMessages(locale as Locale);

  // 浅合并：当前 locale 覆盖 en 的顶层 namespace（深合并交给 next-intl 的 key fallback）。
  const messages = locale === defaultLocale ? fallback : { ...fallback, ...localeMessages };

  return { locale, messages };
});
