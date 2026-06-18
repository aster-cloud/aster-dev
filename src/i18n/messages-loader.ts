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
 * 运行时获取某 locale 的界面文案。
 *
 * **关键（修 MISSING_MESSAGE: playground）**：后端 `/api/v1/messages` 服务的是
 * **aster-cloud** 的界面文案（admin/dashboard/billing…），**不含本文档站特有的
 * namespace**（playground/devSite/devNav/docsNav/devFooter）。若直接用后端响应
 * 替换内嵌副本，dev 的 namespace 会整个消失 → next-intl 报 MISSING_MESSAGE。
 *
 * 因此：**内嵌副本是本站文案的权威基底**，后端只能在其上**叠加/覆盖**（deep-merge），
 * 绝不替换。后端能改文案即显示的能力对**共有 key** 仍生效；dev 特有 namespace 永远
 * 来自内嵌，不会被 cloud 的响应冲掉。fail-open：后端不可达 → 纯内嵌。
 */
export async function loadMessages(locale: Locale): Promise<MessageTree> {
  const embedded = await loadEmbedded(locale);
  const fullId = LOCALE_ID_MAP[locale];
  if (!fullId) {
    return embedded;
  }
  try {
    const res = await fetch(`${API_BASE}/api/v1/messages/${fullId}`, {
      headers: { Accept: 'application/json' },
    });
    if (res.ok) {
      const backend = JSON.parse(await res.text()) as MessageTree;
      // 内嵌为基底，后端叠加在上（dev 特有 namespace 必然保留）。
      return deepMerge(embedded, backend);
    }
    console.warn(`[i18n] backend messages ${fullId} → HTTP ${res.status}; using embedded`);
  } catch (error) {
    console.warn(`[i18n] backend messages fetch failed for ${fullId}; using embedded:`, error);
  }
  return embedded;
}

/** 深合并 override 到 base 之上（dev 特有 namespace 永不丢；空串/空白不覆盖）。 */
function deepMerge(base: MessageTree, override: MessageTree): MessageTree {
  const result: MessageTree = { ...base };
  for (const key of Object.keys(override)) {
    const o = override[key];
    const b = result[key];
    if (
      o !== null && typeof o === 'object' && !Array.isArray(o) &&
      b !== null && typeof b === 'object' && !Array.isArray(b)
    ) {
      result[key] = deepMerge(b as MessageTree, o as MessageTree);
    } else if (typeof o === 'string') {
      if (o.trim().length > 0) result[key] = o;
    } else if (o !== undefined && o !== null) {
      result[key] = o;
    }
  }
  return result;
}
