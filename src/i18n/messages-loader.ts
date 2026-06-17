/**
 * @module i18n/messages-loader
 *
 * 统一语言包 Phase 3：aster-dev 复用 P2 的运行时 messages 加载机制
 * （与 aster-cloud src/i18n/messages-loader.ts 同构）。
 *
 *   后端 /api/v1/messages/<full-id>  ──fail──▶  内嵌 messages/<locale>.json
 *
 * **铁律 fail-open**：fetch / 解析任何一步失败都 fallback 到内嵌副本，绝不白屏。
 * 后端加语言 / 改文案 → 文档站运行时 fetch 到 → 无需重新构建即显示。
 *
 * 注：dev 站的 PoC 阶段不接 Workers KV（cloud 才有 CACHE 绑定）；加载路径为
 * 后端 → 内嵌兜底。后续接入 KV 时按 cloud 的 getCloudflareContext 模式补一层即可。
 */
import { defaultLocale, type Locale } from './config';

/** 短码 locale → 后端 lexicon 全码 id。 */
const LOCALE_ID_MAP: Record<Locale, string> = {
  en: 'en-US',
  zh: 'zh-CN',
  de: 'de-DE',
  hi: 'hi-IN',
};

const API_BASE =
  process.env.NEXT_PUBLIC_ASTER_POLICY_API_URL || 'https://policy.aster-lang.dev';

type MessageTree = Record<string, unknown>;

/** 内嵌 messages（构建期 bundle）—— 最终兜底，永不抛。 */
async function loadEmbedded(locale: Locale): Promise<MessageTree> {
  try {
    return (await import(`../../messages/${locale}.json`)).default as MessageTree;
  } catch {
    if (locale !== defaultLocale) {
      try {
        return (await import(`../../messages/${defaultLocale}.json`)).default as MessageTree;
      } catch {
        /* fall through */
      }
    }
    return {};
  }
}

/**
 * 运行时获取某 locale 的界面文案：后端 → 内嵌兜底。永远 fail-open 返回一个树。
 */
export async function loadMessages(locale: Locale): Promise<MessageTree> {
  const fullId = LOCALE_ID_MAP[locale];
  if (!fullId) {
    return loadEmbedded(locale);
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/messages/${fullId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      return JSON.parse(await res.text()) as MessageTree;
    }
    console.warn(`[i18n] backend messages ${fullId} → HTTP ${res.status}; using embedded`);
  } catch (error) {
    console.warn(`[i18n] backend messages fetch failed for ${fullId}; using embedded:`, error);
  }
  return loadEmbedded(locale);
}
