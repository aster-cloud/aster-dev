'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';

/**
 * 页内目录（On this page）。
 *
 * ★为什么从**运行时 DOM** 读标题，而不是在侧边栏里写死锚点：
 * rehype-slug 按标题**文本**生成 id，各语言各不相同——同一篇 language-guide，
 * en 是 `types`，zh 是 `类型`。侧边栏此前写死 `/docs/language-guide#types`，
 * 于是那几条在中文页是死链（issue #24；de/hi 只是因回落英文页而被掩盖）。
 *
 * 从已渲染的 DOM 读 id 天然跟随当前语言，不需要为每个 locale 维护一份锚点表，
 * 也不会随文档增删小节而过期。
 *
 * ★实现上用 useSyncExternalStore 而非 useEffect+setState：正文 DOM 就是一个
 * "外部系统"，在 effect 里同步 setState 会触发级联渲染（eslint
 * react-hooks/set-state-in-effect 会拦）。这里把 DOM 当订阅源，快照是一个
 * 稳定的字符串键，只有标题真变了才触发重渲染。
 *
 * 只收 h2/h3：h1 是页面标题（TOC 里重复它没意义），h4 以下过细。
 */
interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

const SELECTOR = 'article h2[id], article h3[id]';

/** 读当前正文里的标题，序列化成快照键——内容不变则字符串不变，避免无谓重渲染。 */
function readSnapshot(): string {
  if (typeof document === 'undefined') return '';
  const nodes = document.querySelectorAll<HTMLHeadingElement>(SELECTOR);
  return [...nodes].map((el) => `${el.tagName}:${el.id}:${el.textContent?.trim() ?? ''}`).join('|');
}

/** 服务端渲染时没有 DOM，返回空快照（TOC 在客户端补齐）。 */
function serverSnapshot(): string {
  return '';
}

function parseSnapshot(snapshot: string): Heading[] {
  if (!snapshot) return [];
  return snapshot.split('|').map((row) => {
    const sep1 = row.indexOf(':');
    const sep2 = row.indexOf(':', sep1 + 1);
    return {
      level: row.slice(0, sep1) === 'H2' ? 2 : 3,
      id: row.slice(sep1 + 1, sep2),
      text: row.slice(sep2 + 1),
    } as Heading;
  });
}

export function DocsToc() {
  const t = useTranslations('docsNav');

  // 换页后正文 DOM 才更新，故 subscribe 里挂 MutationObserver 监听正文变化。
  const subscribe = useCallback((onStoreChange: () => void) => {
    const target = document.querySelector('article');
    if (!target) return () => {};
    const observer = new MutationObserver(onStoreChange);
    observer.observe(target, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const snapshot = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  const headings = parseSnapshot(snapshot);

  const [activeId, setActiveId] = useState<string>('');
  // 依赖用字符串键而非每次渲染新建的数组：内容不变则 effect 不重跑。
  // effect 内部再从这个键还原 id 列表，避免在渲染期读写 ref。
  const idsKey = headings.map((h) => h.id).join('|');

  // 高亮当前可视小节。rootMargin 上边距为负：标题滚到视口偏上方才算"当前"，
  // 避免刚进入视口底部就抢高亮、导致快速滚动时来回跳。
  useEffect(() => {
    const ids = idsKey ? idsKey.split('|') : [];
    if (ids.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [idsKey]);

  // 少于两个标题时目录没有导航价值，直接不渲染（避免空框占位）。
  if (headings.length < 2) return null;

  return (
    <nav aria-label={t('onThisPage')} className="text-sm">
      <p className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-fg-subtle">
        {t('onThisPage')}
      </p>
      <ul className="space-y-0.5 border-l border-border">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={activeId === h.id ? 'location' : undefined}
              className={`-ml-px block border-l py-1 pr-2 transition-colors ${
                h.level === 3 ? 'pl-6' : 'pl-3'
              } ${
                activeId === h.id
                  ? 'border-primary font-medium text-primary'
                  : 'border-transparent text-fg-muted hover:border-border-strong hover:text-fg'
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
