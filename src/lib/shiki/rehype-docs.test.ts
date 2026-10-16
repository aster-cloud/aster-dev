import { describe, expect, it } from 'vitest';
import { compile } from '@mdx-js/mdx';
import rehypeShikiDocs from '../../../scripts/rehype-shiki-docs.mjs';

async function render(md: string): Promise<string> {
  const out = await compile(md, { rehypePlugins: [rehypeShikiDocs], jsx: false });
  return String(out);
}

describe('MDX shiki 高亮管线', () => {
  it('aster 块被分词并带双主题变量', async () => {
    const js = await render('```aster\nModule X.\n```\n');
    expect(js).toContain('shiki');
    expect(js).toContain('--shiki-light');
    expect(js).toContain('--shiki-dark');
    // 关键字必须真正被 Aster 语法分词：颜色不同于 github-light 的默认前景色
    // 编译产物是 JSX 对象字面量："--shiki-light": "#D73A49"
    const colors = new Set([...js.matchAll(/"--shiki-light": "(#[0-9a-fA-F]{6})"/g)].map((m) => m[1].toLowerCase()));
    expect(colors.size).toBeGreaterThan(1);
    expect([...colors].some((c) => c !== '#24292e')).toBe(true);
  });

  it('json / bash 被高亮', async () => {
    const js = await render('```json\n{"a": 1}\n```\n\n```bash\necho hi\n```\n');
    expect(js.match(/--shiki-light/g)!.length).toBeGreaterThan(2);
  });

  it('ebnf 无语法时回退纯文本且不抛错', async () => {
    const js = await render('```ebnf\nexpr = term , { "+" , term } ;\n```\n');
    expect(js).toContain('shiki');
  });

  it('无语言标注的代码块也产出 .shiki 标记', async () => {
    const js = await render('```\nplain text\n```\n');
    expect(js).toContain('shiki');
  });

  it('cedar 无语法时按纯文本渲染且不抛错', async () => {
    const js = await render('```cedar\npermit(principal, action, resource);\n```\n');
    expect(js).toContain('shiki');
  });
});
