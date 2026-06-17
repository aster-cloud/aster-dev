/**
 * Playground 样例模板（ADR 0018 Phase 3，移植自旧站 playground-templates.ts 并扩充）。
 *
 * 每个 locale 一组模板（en/zh/de/hi），用 cloud 短码 locale 作 key。源码用各自语言的
 * 关键词，展示 Aster 多语言编程能力。模板 id 跨 locale 稳定，切换语言时保持选中项。
 */
import type { Locale } from '@/i18n/config';

export interface Template {
  id: string;
  name: string;
  source: string;
}

const EN: Template[] = [
  {
    id: 'basic-rule',
    name: 'Basic Rule',
    source: `Module Pricing.

Rule discountedPrice given amount:
  if amount is greater than 100
    then return amount times 90 divided by 100
  else return amount.`,
  },
  {
    id: 'eligibility',
    name: 'Eligibility Check',
    source: `Module Loan.

Rule checkEligibility given applicant:
  if applicant.creditScore is less than 600 then return false.
  if applicant.income is less than 30000 then return false.
  if applicant.age is less than 18 then return false.
  return true.`,
  },
  {
    id: 'tiered-pricing',
    name: 'Tiered Pricing',
    source: `Module Billing.

Rule tier given amount:
  if amount is greater than 10000 then return "enterprise"
  else if amount is greater than 1000 then return "pro"
  else return "starter".`,
  },
  {
    id: 'arithmetic',
    name: 'Arithmetic',
    source: `Module Math.

Rule isEven given n:
  return n modulo 2 is equal to 0.

Rule halfOf given n:
  return n integer divided by 2.`,
  },
  {
    id: 'loan-approval',
    name: 'Loan Approval',
    source: `Module LoanApproval.

Rule approve given applicant:
  if applicant.creditScore is at least 700
    and applicant.income is greater than 50000
  then return "approved"
  else return "manual review".`,
  },
];

const ZH: Template[] = [
  {
    id: 'basic-rule',
    name: '基础规则',
    source: `模块 定价。

规则 折后价 给定 金额：
  如果 金额 大于 100
    那么 返回 金额 乘以 90 除以 100
  否则 返回 金额。`,
  },
  {
    id: 'eligibility',
    name: '资格审查',
    source: `模块 贷款。

规则 检查资格 给定 申请人：
  如果 申请人.信用分 小于 600 那么 返回 假。
  如果 申请人.收入 小于 30000 那么 返回 假。
  返回 真。`,
  },
  {
    id: 'loan-approval',
    name: '贷款审批',
    source: `模块 贷款审批。

规则 审批 给定 申请人：
  如果 申请人.信用分 至少为 700
    并且 申请人.收入 大于 50000
  那么 返回 "已批准"
  否则 返回 "人工复核"。`,
  },
];

const DE: Template[] = [
  {
    id: 'basic-rule',
    name: 'Grundregel',
    source: `Modul Preisgestaltung.

Regel rabattPreis gegeben betrag:
  wenn betrag größer als 100
    dann gib betrag mal 90 geteilt durch 100 zurück
  sonst gib betrag zurück.`,
  },
  {
    id: 'eligibility',
    name: 'Berechtigungsprüfung',
    source: `Modul Kredit.

Regel prüfeBerechtigung gegeben antragsteller:
  wenn antragsteller.bonität kleiner als 600 dann gib falsch zurück.
  wenn antragsteller.einkommen kleiner als 30000 dann gib falsch zurück.
  gib wahr zurück.`,
  },
];

const HI: Template[] = [
  {
    id: 'basic-rule',
    name: 'मूल नियम',
    source: `मॉड्यूल मूल्यनिर्धारण।

नियम छूटमूल्य दिया गया राशि:
  यदि राशि 100 से अधिक है
    तब राशि गुणा 90 भाग 100 लौटाएं
  अन्यथा राशि लौटाएं।`,
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
