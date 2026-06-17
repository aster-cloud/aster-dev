import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageRegistration,
} from 'shiki/core';
import { createOnigurumaEngine } from 'shiki/engine/oniguruma';
import { asterGrammar } from './aster-grammar';

/**
 * 运行时 shiki 高亮器（ADR 0018 Phase 3 playground 全功能）。
 *
 * 移植旧站的 aster-grammar（TextMate）—— 与 aster-cloud 同款 shiki 着色路径。
 * 用 createHighlighterCore + oniguruma WASM 引擎，按需加载（仅 aster 语言 +
 * github-light/dark 主题），单例缓存，避免每次高亮重建。
 *
 * 仅在客户端用（playground 实时高亮 + docs 代码块）。SSR 时不调用。
 */
let highlighterPromise: Promise<HighlighterCore> | null = null;

export function getAsterHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [
        import('shiki/themes/github-light.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ],
      langs: [asterGrammar as unknown as LanguageRegistration],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    });
  }
  return highlighterPromise;
}

/**
 * 高亮 Aster 源码为 HTML。亮/暗双主题（CSS 变量驱动，跟随 data-theme 翻转）。
 */
export async function highlightAster(code: string): Promise<string> {
  const hl = await getAsterHighlighter();
  return hl.codeToHtml(code, {
    lang: 'aster',
    themes: { light: 'github-light', dark: 'github-dark' },
    defaultColor: false, // 输出 CSS 变量，由 data-theme 切换亮/暗
  });
}
