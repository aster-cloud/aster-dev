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
  });

  it('json / bash 被高亮', async () => {
    const js = await render('```json\n{"a": 1}\n```\n\n```bash\necho hi\n```\n');
    expect(js.match(/--shiki-light/g)!.length).toBeGreaterThan(2);
  });

  it('cedar 无语法时按纯文本渲染且不抛错', async () => {
    const js = await render('```cedar\npermit(principal, action, resource);\n```\n');
    expect(js).toContain('shiki');
  });
});
