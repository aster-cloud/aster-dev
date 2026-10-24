// Next 内置的 path-to-regexp（next/dist/compiled）不带类型声明。legacy-redirects.test.ts
// 用它按线上同一语义匹配重定向规则，这里只声明用到的 match。
declare module 'next/dist/compiled/path-to-regexp' {
  export function match(
    path: string,
  ): (pathname: string) => false | { path: string; index: number; params: Record<string, unknown> };
}
