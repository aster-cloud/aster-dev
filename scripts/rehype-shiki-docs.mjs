import rehypeShikiFromHighlighter from '@shikijs/rehype';
import { asterGrammar } from '../src/lib/shiki/aster-grammar.ts';

/**
 * MDX 代码块构建期高亮（服务端，不进客户端 bundle）。
 *
 * - 复用 playground 的 Aster TextMate 语法与 github-light/dark 主题。
 * - defaultColor=false：输出 --shiki-light/--shiki-dark CSS 变量，
 *   由 globals.css 按 [data-theme="dark"] 切换。
 * - Turbopack 的 rehype 插件必须以字符串引用且选项可序列化，
 *   因此在此包一层，把语法对象在模块内注入。
 * - cedar 无内置语法，别名到 text 以纯文本渲染；未知语言回退 text。
 */
export const shikiOptions = {
  themes: { light: 'github-light', dark: 'github-dark' },
  defaultColor: false,
  langs: [asterGrammar, 'json', 'bash', 'js', 'ts', 'text'],
  langAlias: { cedar: 'text' },
  fallbackLanguage: 'text',
};

export default function rehypeShikiDocs() {
  return rehypeShikiFromHighlighter.call(this, shikiOptions);
}
