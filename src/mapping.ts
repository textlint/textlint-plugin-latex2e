import { ASTNodeTypes } from "@textlint/ast-node-types";

export const nodeTypeMap = {
  string: ASTNodeTypes.Str,
  whitespace: ASTNodeTypes.Str,
  verb: ASTNodeTypes.Code,
  inlinemath: ASTNodeTypes.Code,
  parbreak: ASTNodeTypes.Break,
  comment: ASTNodeTypes.Comment,
};

type InlineMacroType =
  | ASTNodeTypes.Str
  | ASTNodeTypes.Emphasis
  | ASTNodeTypes.Strong
  | ASTNodeTypes.Delete
  | ASTNodeTypes.Html
  | ASTNodeTypes.Code;

// Ref: https://github.com/siefkenj/unified-latex/blob/main/packages/unified-latex-ctan/package/latex2e/provides.ts
export const inlineMacroTypeMap: { [key: string]: InlineMacroType } = {
  // Text
  textrm: ASTNodeTypes.Str,
  textit: ASTNodeTypes.Emphasis,
  textmd: ASTNodeTypes.Strong,
  textup: ASTNodeTypes.Emphasis,
  textsl: ASTNodeTypes.Emphasis,
  textsf: ASTNodeTypes.Emphasis,
  textsc: ASTNodeTypes.Emphasis,
  textbf: ASTNodeTypes.Strong,
  texttt: ASTNodeTypes.Code,
  emph: ASTNodeTypes.Emphasis,
  textnormal: ASTNodeTypes.Str,
  uppercase: ASTNodeTypes.Str,

  // Math
  mathbf: ASTNodeTypes.Code,
  mathit: ASTNodeTypes.Code,
  mathsf: ASTNodeTypes.Code,
  mathtt: ASTNodeTypes.Code,
  mathnormal: ASTNodeTypes.Code,
  mathcal: ASTNodeTypes.Code,
  mathrm: ASTNodeTypes.Code,

  // Color
  // We consider them as a type of emphasis.
  color: ASTNodeTypes.Emphasis,
  textcolor: ASTNodeTypes.Emphasis,
  colorbox: ASTNodeTypes.Emphasis,
  fcolorbox: ASTNodeTypes.Emphasis,

  // Other
  caption: ASTNodeTypes.Str,
  footnotetext: ASTNodeTypes.Str,

  // How to handle these?
  //
  // footenotes is an independent paragraph, and it is in other paragraphs.
  // However, textlint does not allow nested paragraphs.
  // "footnote": ASTNodeTypes.Str,
};

type BlockMacroType = ASTNodeTypes.Header | ASTNodeTypes.Html;

export const blockMacroTypeMap: { [key: string]: BlockMacroType } = {
  par: ASTNodeTypes.Html,
  title: ASTNodeTypes.Header,
  part: ASTNodeTypes.Header,
  chapter: ASTNodeTypes.Header,
  section: ASTNodeTypes.Header,
  subsection: ASTNodeTypes.Header,
  subsubsection: ASTNodeTypes.Header,
  paragraph: ASTNodeTypes.Header,
  subparagraph: ASTNodeTypes.Header,
};

type HeaderDepth = 1 | 2 | 3 | 4 | 5 | 6;

export const headerDepthMap: { [key: string]: HeaderDepth } = {
  part: 1,
  title: 1,
  chapter: 2,
  section: 3,
  subsection: 4,
  subsubsection: 5,
  paragraph: 6,
  // textlint has no support for deeper than paragraph
  subparagraph: 6,
};
