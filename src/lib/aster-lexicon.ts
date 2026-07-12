import type { Lexicon } from '@aster-cloud/aster-lang-ts/browser';
import { EN_US } from '@aster-cloud/aster-lang-ts/lexicons/en-US';
import { ZH_CN } from '@aster-cloud/aster-lang-ts/lexicons/zh-CN';
import { DE_DE } from '@aster-cloud/aster-lang-ts/lexicons/de-DE';
import { HI_IN } from '@aster-cloud/aster-lang-ts/lexicons/hi-IN';
import type { Locale } from '../i18n/config';

/**
 * playground 源语言（UI locale）→ 打包的 CNL lexicon。
 *
 * lexicon 是构建时静态 ES 导入（无网络、无运行时 fetch），静态站可直接用。
 * 四语（en/zh/de/hi）与 aster-cloud 客户端编译路径同源。
 */
const LEXICON_MAP: Record<Locale, Lexicon> = {
  en: EN_US,
  zh: ZH_CN,
  de: DE_DE,
  hi: HI_IN,
};

export function getLexicon(locale: Locale): Lexicon {
  return LEXICON_MAP[locale] ?? EN_US;
}
