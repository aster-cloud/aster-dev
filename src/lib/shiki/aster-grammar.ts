/**
 * Aster CNL TextMate grammar for Shiki.
 *
 * Why this exists: every code block in docs/learn / docs/api / blog
 * fenced with ```aster used to render as plain text — VitePress (Shiki)
 * had no grammar for the language. The biggest asset of the dev site
 * is the Aster language itself, so it should be the most carefully
 * displayed thing on the page.
 *
 * Why hand-rolled (not auto-generated from ANTLR): the .g4 grammar in
 * aster-lang-core is parser-grade — it cares about LL precedence and
 * disambiguation. TextMate grammars care about *visual tokenization*,
 * which is regex-driven and tolerates ambiguity. Hand-rolling a small
 * one is straightforward; transpiling ANTLR → TextMate is a research
 * project we don't need.
 *
 * Token scopes follow standard TextMate naming (keyword.control.aster,
 * variable.parameter.aster, etc.) so themes that match scopes like
 * "keyword.control" automatically style our tokens with no theme
 * customization. Shiki's built-in github-light / github-dark themes
 * (which VitePress uses) already cover these scopes — so Aster CNL
 * picks up the same coloring as Python's `if`, JavaScript's `let`, etc.
 *
 * Lexicon coverage: matches the canonical EN/ZH/DE keyword surface
 * (Module, Rule, has, given, decide, otherwise, plus 中文 + Deutsch
 * equivalents). When the lexicon evolves, update KEYWORDS_*.
 */

/* ------------------------------------------------------------------ */
/* Keyword tables — keep in sync with aster-lang-core lexicons         */
/* ------------------------------------------------------------------ */

const KEYWORDS_STRUCTURAL = [
  // English
  'Module', 'Rule', 'Function', 'Type', 'Enum',
  // 中文
  '模块', '规则', '函数', '类型',
  // Deutsch
  'Modul', 'Regel', 'Funktion', 'Typ',
  // हिन्दी (Devanagari) — 见 aster-lang-core builtin/hi-IN.json
  'मॉड्यूल', 'नियम', 'परिभाषित',
];

const KEYWORDS_RELATIONAL = [
  // English
  'has', 'given', 'where', 'in', 'of', 'with', 'as', 'and', 'or', 'not',
  // 中文
  '具有', '给定', '其中', '为', '与', '或', '非',
  // Deutsch
  'hat', 'gegeben', 'wo', 'in', 'von', 'mit', 'als', 'und', 'oder', 'nicht',
];

const KEYWORDS_CONTROL = [
  // English — both lowercase (canonical post-W1 lexicon) and capitalized
  // (older documentation samples still in flight) are recognized so all
  // existing docs render correctly.
  'if', 'If', 'then', 'Then', 'else', 'Else', 'otherwise', 'Otherwise',
  'when', 'When', 'for', 'For', 'each', 'Each',
  // 中文
  '如果', '那么', '否则', '当', '对每个',
  // Deutsch
  'wenn', 'Wenn', 'dann', 'Dann', 'sonst', 'Sonst', 'andernfalls', 'Andernfalls',
  // हिन्दी
  'यदि', 'अन्यथा', 'जब', 'प्रत्येक', 'मिलान',
];

const KEYWORDS_ACTION = [
  // English — lowercase + capitalized forms
  'decide', 'Decide',
  'approve', 'Approve', 'reject', 'Reject',
  'allow', 'Allow', 'deny', 'Deny',
  'release', 'Release', 'hold', 'Hold',
  'return', 'Return',
  'audit_trail', 'log', 'commit',
  'is at least', 'is at most',  // not real tokens but kept here as note;
                                 // multi-word matches are out of scope for
                                 // the regex-driven TextMate engine —
                                 // multi-word keywords stay unhighlighted,
                                 // which is acceptable for the marketing site.
  // 中文
  '决定', '批准', '拒绝', '允许', '返回',
  // Deutsch
  'entscheide', 'Entscheide',
  'genehmigen', 'Genehmigen',
  'ablehnen', 'Ablehnen',
  'erlauben', 'Erlauben',
  'zurückgeben', 'Zurückgeben',
  // हिन्दी
  'लौटाएं', 'दिया गया', 'उत्पन्न',
];

const KEYWORDS_BOOLEAN = [
  'true', 'false', 'null', 'none',
  '真', '假', '空',
  'wahr', 'falsch', 'nichts',
  // हिन्दी
  'सत्य', 'असत्य', 'शून्य', 'कोई नहीं',
];

/** Construct a regex that matches any keyword in the list as a whole word. */
function kw(words: readonly string[]): string {
  // Word boundary semantics differ for CJK characters — wrap each token
  // independently and join with |. The (?:^|\\b|(?<=[\\s,.;:]))... lookbehind
  // is intentionally avoided; Shiki uses Oniguruma which supports \b, and
  // for CJK we accept that surrounding punctuation does the bounding work.
  return `\\b(?:${words.join('|')})\\b`;
}

/* ------------------------------------------------------------------ */
/* Grammar export                                                      */
/* ------------------------------------------------------------------ */

/**
 * Shiki/VS-Code-compatible TextMate grammar. Aliased as both `aster`
 * and `aster-cnl` so existing docs ```aster fences light up immediately.
 */
export const asterGrammar = {
  name: 'aster',
  scopeName: 'source.aster',
  aliases: ['aster-cnl', 'cnl'],
  patterns: [
    { include: '#comments' },
    { include: '#strings' },
    { include: '#numbers' },
    { include: '#keywords' },
    { include: '#operators' },
    { include: '#identifiers' },
  ],
  repository: {
    comments: {
      patterns: [
        { name: 'comment.line.double-slash.aster', match: '//.*$' },
        { name: 'comment.line.number-sign.aster',  match: '#.*$' },
      ],
    },
    strings: {
      patterns: [
        // English double-quoted
        {
          name: 'string.quoted.double.aster',
          begin: '"',
          end: '"',
          patterns: [
            { name: 'constant.character.escape.aster', match: '\\\\.' },
          ],
        },
        // Single-quoted
        {
          name: 'string.quoted.single.aster',
          begin: "'",
          end: "'",
          patterns: [
            { name: 'constant.character.escape.aster', match: '\\\\.' },
          ],
        },
        // 中文 「...」 quotes — first-class because CNL literals in
        // Chinese policies use them by convention.
        {
          name: 'string.quoted.chinese.aster',
          begin: '「',
          end: '」',
        },
      ],
    },
    numbers: {
      patterns: [
        { name: 'constant.numeric.float.aster',   match: '\\b\\d+\\.\\d+\\b' },
        { name: 'constant.numeric.integer.aster', match: '\\b\\d+\\b' },
      ],
    },
    keywords: {
      patterns: [
        { name: 'keyword.control.module.aster',   match: kw(KEYWORDS_STRUCTURAL) },
        { name: 'keyword.control.relational.aster', match: kw(KEYWORDS_RELATIONAL) },
        { name: 'keyword.control.flow.aster',     match: kw(KEYWORDS_CONTROL) },
        { name: 'keyword.other.action.aster',     match: kw(KEYWORDS_ACTION) },
        { name: 'constant.language.boolean.aster', match: kw(KEYWORDS_BOOLEAN) },
      ],
    },
    operators: {
      patterns: [
        // Comparison + arithmetic
        { name: 'keyword.operator.comparison.aster', match: '(>=|<=|==|!=|>|<|=)' },
        { name: 'keyword.operator.arithmetic.aster', match: '(\\+|-|\\*|/)' },
        // Punctuation (sentence terminators are meaningful in CNL)
        { name: 'punctuation.terminator.aster',     match: '\\.' },
      ],
    },
    identifiers: {
      patterns: [
        // Matches both ASCII identifiers and CJK / German-umlaut identifiers.
        // Doesn't get assigned a scope intentionally — falls through as
        // "the default text color", matching how policy bodies should read.
        {
          match: '\\b[A-Za-z_\\u4e00-\\u9fa5][A-Za-z0-9_\\u4e00-\\u9fa5]*\\b',
        },
      ],
    },
  },
};
