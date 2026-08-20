import { getTranslations } from 'next-intl/server';

/**
 * "本页尚未翻译，显示英文原文"提示条。
 *
 * de/hi 目前只有 quickstart 一篇本地化文档，其余 8 篇都会回落英文。回落好过 404，
 * 但**静默**回落会让读者以为"这就是德语文档"——语言切换器只显示 Deutsch，
 * 且 partialLocales 为空（那个标志指的是 UI 文案 184/184 已齐，不含文档正文）。
 * 这条提示把回落变成可见事实。
 */
export async function DocsFallbackNotice({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'docsFallback' });
  return (
    <div
      role="note"
      className="mb-6 rounded-xl border border-border bg-bg-muted p-4 text-sm"
    >
      <p className="font-semibold text-fg">{t('title')}</p>
      <p className="mt-1 text-fg-muted">{t('body')}</p>
    </div>
  );
}
