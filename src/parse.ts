import { TxtDocumentNode, ASTNodeTypes } from "@textlint/ast-node-types";
import {
  Content,
  PhrasingContent,
  TxtNodeLocation,
  TxtNodeRange,
} from "@textlint/ast-node-types/lib/src/NodeType";
import * as LatexAst from "@unified-latex/unified-latex-types";
import { getParser } from "@unified-latex/unified-latex-util-parse";

import { convertPosition, flattenGroups, notNull } from "./helpers.js";
import { convertToHTMLOrComment, convertNodes } from "./convert.js";

export const parse = (document: string): TxtDocumentNode => {
  const parser = getParser();
  const parsedAst = parser.parse(document);
  return convertToTextlintAST(parsedAst, document);
};

export const convertToTextlintAST = (
  root: LatexAst.Root,
  rawText: string,
): TxtDocumentNode => {
  if (!root.position) {
    throw new Error("root.position is required");
  }
  // In documents such as Markdown, there is no explicit document start position.
  // Basically, in LaTeX, `\begin{document} ~~ \end{document}` explicitly determines the start and end of a document.
  // Therefore, we need to split the document into preamble (before \begin{document}), content, and postamble (after \end{document}).
  // eslint-disable-next-line prefer-const
  let [preamble, content, postamble] = splitDocument(
    flattenGroups(root.content),
  );

  if (content.length === 0) {
    // When content does not exist, postamble also does not exist.
    // There are several possibilities in this case.
    // - This tex file is a file to be embedded in another tex document
    // - The tex file has a syntax error.
    // In this section, we consider the former possibility and treat the preamble as content.
    [content, preamble] = [preamble, []];
  }

  // Preamble and postamble are treated as a metadata for the document.
  // Convert them as HTML or Comment node. Typically, HTML or Comment node is ignored in textlint rules.
  const preambleNodes = preamble
    .map((node) => convertToHTMLOrComment(node, rawText))
    .filter(notNull);
  const postambleNodes = postamble
    .map((node) => convertToHTMLOrComment(node, rawText))
    .filter(notNull);

  // Convert nodes in document environment.
  const contentNodes = concatAdjacentStrNodes(convertNodes(content, rawText));

  const [loc, range] = convertPosition(root.position);
  const allNodes: Content[] = [];
  return {
    type: ASTNodeTypes.Document,
    raw: rawText,
    range: range,
    loc: loc,
    children: allNodes.concat(preambleNodes, contentNodes, postambleNodes),
  };
};

// splitDocument splits the AST into preamble, content, and postamble.
// This try to find `\begin{document}` and extract its content as document.
// First part is preamble, second part is document, and third part is postamble.
const splitDocument = (
  nodes: LatexAst.Node[],
): [LatexAst.Node[], LatexAst.Node[], LatexAst.Node[]] => {
  const preamble: LatexAst.Node[] = [];
  const content: LatexAst.Node[] = [];
  const postamble: LatexAst.Node[] = [];
  let target: LatexAst.Node[] = preamble;
  nodes.forEach((node) => {
    if (node.type === "environment" && node.env === "document") {
      content.push(...node.content);
      target = postamble;
      return;
    }
    target.push(node);
  });
  return [preamble, content, postamble];
};

// concatAdjacentStrNodes concatenates adjacent string nodes.
// LaTeX AST has a lot of string nodes since a whitespace is an independent node.
// We concatenate adjacent string nodes to make str node easier to handle.
const concatAdjacentStrNodes = <NodeType extends Content>(
  nodes: NodeType[],
): NodeType[] => {
  const concatText = (nodes: PhrasingContent[]): PhrasingContent[] => {
    const textNodes: PhrasingContent[] = [];
    let startLoc: TxtNodeLocation, startRange: TxtNodeRange;
    let lastLoc: TxtNodeLocation, lastRange: TxtNodeRange;
    let buffer = "";
    let rawBuffer = "";
    const finalizeBuffer = () => {
      if (buffer || rawBuffer) {
        textNodes.push({
          type: ASTNodeTypes.Str,
          loc: {
            start: startLoc.start,
            end: lastLoc.end,
          },
          range: [startRange[0], lastRange[1]],
          raw: rawBuffer,
          value: buffer,
        });
        buffer = "";
        rawBuffer = "";
      }
    };
    nodes.forEach((node) => {
      switch (node.type) {
        case ASTNodeTypes.Str:
          startLoc = startLoc || node.loc;
          startRange = startRange || node.range;
          lastLoc = node.loc;
          lastRange = node.range;
          buffer += node.value;
          rawBuffer += node.raw;
          break;
        default:
          finalizeBuffer();
          textNodes.push(node);
      }
    });
    finalizeBuffer();
    return textNodes;
  };
  return nodes.map((node): NodeType => {
    switch (node.type) {
      case ASTNodeTypes.Delete:
      case ASTNodeTypes.Emphasis:
      case ASTNodeTypes.Header:
      case ASTNodeTypes.Link:
      case ASTNodeTypes.Paragraph:
      case ASTNodeTypes.Strong:
      case ASTNodeTypes.TableCell:
        node.children = concatText(node.children);
        break;
      case ASTNodeTypes.ListItem:
      case ASTNodeTypes.BlockQuote:
        // BlockContent
        node.children = concatAdjacentStrNodes(node.children);
        break;
      case ASTNodeTypes.TableRow:
        // TableRow
        node.children = concatAdjacentStrNodes(node.children);
        break;
      case ASTNodeTypes.Table:
        // TxtTableNode
        node.children = concatAdjacentStrNodes(node.children);
        break;
      case ASTNodeTypes.List:
        // TxtListItemNode
        node.children = concatAdjacentStrNodes(node.children);
        break;
    }
    return node;
  });
};
