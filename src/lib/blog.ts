import type { ComponentType } from 'react';

/**
 * 博客文章清单（正文在 content/blog/<slug>.mdx，仅英文）。
 *
 * 元数据放在这里而不是 MDX frontmatter：日期是类型化的 ISO 字符串，列表页、
 * 文章页与 RSS 共用同一份数据。旧 VitePress 站把日期写在 YAML 里，裸日期被解析成
 * Date 对象后被 `typeof === 'string'` 过滤掉，列表页因此永远为空（issue #44）。
 * blog.test.ts 会校验日期格式、slug 唯一以及每篇都有正文文件。
 *
 * 新增文章：在 content/blog/ 放 <slug>.mdx，再在 POSTS 里追加一条。
 */
export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  /** ISO 日期 YYYY-MM-DD */
  date: string;
  author: string;
  tags: readonly string[];
}

const POSTS: readonly BlogPost[] = [
  {
    slug: '2026-05-07-decision-traces-in-production',
    title: "Decision traces in production: what's in ?trace=true, and why",
    description:
      "Aster Lang's decision-trace payload captures every condition, branch, and intermediate value of a rule execution. Here's what's in it, what it's for, and the design choices behind making it always-on.",
    date: '2026-05-07',
    author: 'Aster Lang Team',
    tags: ['engineering', 'audit', 'product'],
  },
  {
    slug: '2026-04-09-why-truffle',
    title: 'Why Truffle: the boring engine choices that make the playground fast',
    description:
      "Aster Lang's Java reference engine is built on GraalVM Truffle. Here's how that decision plays out in practice — sub-second cold starts, partial evaluation, and the trade-offs we accepted.",
    date: '2026-04-09',
    author: 'Aster Lang Team',
    tags: ['engineering', 'performance'],
  },
  {
    slug: '2026-03-19-lexicon-packs',
    title: 'Lexicon packs: shipping Aster Lang in a fourth language without writing Java',
    description:
      "Adding a new natural-language surface to Aster Lang is a configuration task, not an engineering one. Here's the contract a lexicon pack obeys and how to publish one.",
    date: '2026-03-19',
    author: 'Aster Lang Team',
    tags: ['product', 'language', 'i18n'],
  },
  {
    slug: '2026-02-12-controlled-natural-language',
    title: 'Why a controlled natural language, and not a DSL?',
    description:
      "Aster Lang reads like a memo. That's a deliberate design choice with consequences — for who can author rules, for what AI can do with them, and for what we can't easily do.",
    date: '2026-02-12',
    author: 'Aster Lang Team',
    tags: ['language', 'design'],
  },
  {
    slug: '2026-01-15-hello-world',
    title: 'Hello, World — and what to expect from this blog',
    description:
      "An introduction to the Aster Lang blog. What we'll cover, who it's for, and why we're starting it now.",
    date: '2026-01-15',
    author: 'Aster Lang Team',
    tags: ['announcement'],
  },
];

/** 全部文章，按日期倒序。 */
export function listPosts(): readonly BlogPost[] {
  return [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPost(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}

/** 按 slug 加载正文。只接受清单里的 slug，避免动态 import 任意路径。 */
export async function loadPostContent(slug: string): Promise<ComponentType | undefined> {
  if (!getPost(slug)) return undefined;
  return (await import(`../../content/blog/${slug}.mdx`)).default as ComponentType;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-01-15" → "Jan 15, 2026"。固定英文格式：正文只有英文，且不受运行环境 ICU 影响。 */
export function formatPostDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}
