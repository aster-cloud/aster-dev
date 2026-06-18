/**
 * Playground 样例模板（ADR 0018 Phase 3）。
 *
 * 源码用**部署后端实际接受的方言**（带类型注解 `given p as Int, produce T:`、
 * 大写 `If`/`Return`、`X greater than Y` 形式）—— 与旧站 playground-templates 一致，
 * 因为生产 backend（Truffle/ANTLR 路径）就吃这套。每个 locale 一组，源码用各自语言
 * 关键词，展示多语言编程。模板含 entry（functionName）+ context（输入数据）。
 */
import type { Locale } from '@/i18n/config';

export interface Template {
  id: string;
  name: string;
  source: string;
  /** 后端求值的入口规则名（functionName）。 */
  entry: string;
  /** 入口规则的输入数据（context），JSON 字符串便于编辑。 */
  context: string;
}

const EN: Template[] = [
  {
    id: 'basic-rule',
    name: 'Basic Rule',
    entry: 'calculatePrice',
    context: '{\n  "amount": 200\n}',
    source: `Module pricing.

Rule calculatePrice given amount as Int, produce Int:
  If amount greater than 100
    Return amount times 90 divided by 100.
  Return amount.`,
  },
  {
    id: 'eligibility',
    name: 'Eligibility Check',
    entry: 'checkEligibility',
    context: '{\n  "applicant": { "creditScore": 720, "income": 65000, "age": 34 }\n}',
    source: `Module loan.

Define Applicant has creditScore as Int, income as Int, age as Int.

Rule checkEligibility given applicant as Applicant, produce Bool:
  If applicant.creditScore less than 600
    Return false.
  If applicant.income less than 30000
    Return false.
  If applicant.age less than 18
    Return false.
  Return true.`,
  },
  {
    id: 'struct-types',
    name: 'Struct Types',
    entry: 'calculateQuote',
    context: '{\n  "vehicle": { "make": "Tesla", "year": 2012, "value": 40000 }\n}',
    source: `Module insurance.

Define Vehicle has make as Text, year as Int, value as Int.
Define Quote has premium as Int, deductible as Int.

Rule calculateQuote given vehicle as Vehicle, produce Quote:
  If vehicle.year less than 2015
    Return Quote with premium set to vehicle.value times 5 divided by 100, deductible set to 1000.
  Return Quote with premium set to vehicle.value times 3 divided by 100, deductible set to 500.`,
  },
];

const ZH: Template[] = [
  {
    id: 'basic-rule',
    name: '基础规则',
    entry: '计算价格',
    context: '{\n  "金额": 200\n}',
    source: `模块 定价。

规则 计算价格 给定 金额 作为 整数，产出 整数：
  如果 金额 大于 100
    返回 金额 乘以 90 除以 100。
  返回 金额。`,
  },
  {
    id: 'eligibility',
    name: '资格审查',
    entry: '审查资格',
    context: '{\n  "申请人": { "信用评分": 720, "收入": 65000, "年龄": 34 }\n}',
    source: `模块 贷款。

定义 申请人类型 包含 信用评分 作为 整数，收入 作为 整数，年龄 作为 整数。

规则 审查资格 给定 申请人 作为 申请人类型，产出 布尔：
  如果 申请人.信用评分 小于 600
    返回 假。
  如果 申请人.收入 小于 30000
    返回 假。
  如果 申请人.年龄 小于 18
    返回 假。
  返回 真。`,
  },
];

const DE: Template[] = [
  {
    id: 'basic-rule',
    name: 'Grundregel',
    entry: 'berechnePreis',
    context: '{\n  "betrag": 200\n}',
    source: `Modul preisgestaltung.

Regel berechnePreis gegeben betrag als Ganzzahl, liefert Ganzzahl:
  Wenn betrag größer als 100
    Gib zurück betrag mal 90 geteilt durch 100.
  Gib zurück betrag.`,
  },
];

const HI: Template[] = [
  {
    id: 'basic-rule',
    name: 'मूल नियम',
    entry: 'discountedPrice',
    context: '{\n  "amount": 200\n}',
    source: `मॉड्यूल pricing।

नियम discountedPrice दिया गया amount रूप में पूर्णांक, उत्पन्न पूर्णांक:
  यदि amount से अधिक 100
    लौटाएं amount गुणा 90 भाग 100।
  लौटाएं amount।`,
  },
  {
    id: 'eligibility',
    name: 'पात्रता जाँच',
    entry: 'checkEligibility',
    context: '{\n  "applicant": { "creditScore": 720, "income": 65000, "age": 34 }\n}',
    source: `मॉड्यूल loan।

परिभाषित Applicant रखता है creditScore रूप में पूर्णांक, income रूप में पूर्णांक, age रूप में पूर्णांक।

नियम checkEligibility दिया गया applicant रूप में Applicant, उत्पन्न बूलियन:
  यदि applicant.creditScore से कम 600
    लौटाएं असत्य।
  यदि applicant.income से कम 30000
    लौटाएं असत्य।
  यदि applicant.age से कम 18
    लौटाएं असत्य।
  लौटाएं सत्य।`,
  },
];

export const templates: Record<Locale, Template[]> = {
  en: EN,
  zh: ZH,
  de: DE,
  hi: HI,
};

/** 取某 locale 的模板；缺失/空则 fallback 到 en（与 messages fail-open 同纪律）。 */
export function templatesFor(locale: Locale): Template[] {
  const list = templates[locale];
  return list && list.length > 0 ? list : templates.en;
}
