import type { MDXComponents } from 'mdx/types';

/**
 * MDX 组件映射（Next.js App Router 约定的根级 mdx-components.tsx）。
 * PoC 阶段用默认 HTML 元素；后续里程碑可注入代码高亮、Callout 等（对照 VitePress
 * 的 markdown 增强）。
 */
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
