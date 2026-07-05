/**
 * @/components/ui — 设计系统基元的单一 import 入口（迁移自 aster-cloud 同款约定）。
 *
 * 从 @aster-cloud/ui（已发布设计系统）re-export，让迁来的 demo 保持
 * `import { Card, … } from '@/components/ui'` 的熟悉路径。本站（aster-lang.dev）当前只用
 * demo 需要的少量基元；新增共享基元请在 aster-design-system 里做，不要在此目录堆自研组件。
 */

export {
  cn,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  Container,
  Stack,
} from '@aster-cloud/ui';

export type {
  ContainerProps,
  StackProps,
} from '@aster-cloud/ui';
