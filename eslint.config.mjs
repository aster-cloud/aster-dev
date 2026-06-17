import next from 'eslint-config-next';

// Next 16 的 eslint-config-next 直接导出 flat config 数组，无需 FlatCompat。
const eslintConfig = [
  ...next,
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
];

export default eslintConfig;
