import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// locale 感知的 Link / useRouter / redirect 等（自动带 /[locale] 前缀）。
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
