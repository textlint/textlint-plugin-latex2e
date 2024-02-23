import {
  ASTNodeTypes,
  TxtNodeLocation,
  TxtNodeRange,
} from "@textlint/ast-node-types";
import {
  BlockContent,
  PhrasingContent,
  TxtCommentNode,
  TxtHtmlNode,
  TxtListItemNode,
  TableContent,
  TxtTableCellNode,
  TxtTableRowNode,
} from "@textlint/ast-node-types/lib/src/NodeType.js";
import * as LatexAst from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

import {
  convertPosition,
  extractStringFromArgs,
  asStrNode,
  notNull,
  extractStringFromNodes,
  estimateMacroPosition,
} from "./helpers.js";
import {
  headerDepthMap,
  inlineMacroTypeMap,
  blockMacroTypeMap,
} from "./mapping.js";

// convertNodes converts LaTeX AST nodes to textlint AST nodes.
// This function will detect the start and end of a paragraph and convert them to a paragraph node.
export const convertNodes = (
  nodes: LatexAst.Node[],
  rawText: string
): BlockContent[] => {
  const allNodes: BlockContent[] = [];
  let paragraphStartLoc: TxtNodeLocation | null = null;
  let paragraphStartRange: TxtNodeRange | null = null;
  let lastLoc: TxtNodeLocation;
  let lastRange: TxtNodeRange;
  let paragraphChildrenCandidates: PhrasingContent[] = [];
  const finalizeParagraph = () => {
    if (paragraphStartLoc && paragraphStartRange) {
      const paragraphRange: [number, number] = [
        paragraphStartRange[0],
        lastRange[1],
      ];
      allNodes.push({
        type: ASTNodeTypes.Paragraph,
        children: paragraphChildrenCandidates.slice(),
        loc: {
          start: paragraphStartLoc.start,
          end: lastLoc.end,
        },
        range: paragraphRange,
        raw: rawText.slice(paragraphRange[0], paragraphRange[1]),
      });
      paragraphStartLoc = null;
      paragraphStartRange = null;
      paragraphChildrenCandidates = [];
    }
  };
  nodes.forEach((node) => {
    if (!node.position) {
      return;
    }
    switch (node.type) {
      case "macro": {
        const [macroLoc, macroRange] =
          estimateMacroPosition(node) || convertPosition(node.position);
        if (node.content in blockMacroTypeMap) {
          finalizeParagraph();
          allNodes.push(...convertBlockNode(node, rawText));
        } else {
          // Other macros are considered as inline nodes.
          if (!paragraphStartLoc || !paragraphStartRange) {
            [paragraphStartLoc, paragraphStartRange] = [macroLoc, macroRange];
          }
          const strNode = convertInlineNode(node, rawText);
          if (strNode) {
            paragraphChildrenCandidates.push(...strNode);
          }
        }
        [lastLoc, lastRange] = [macroLoc, macroRange];
        return;
      }
      case "comment":
      case "verb":
      case "inlinemath":
      case "whitespace":
      case "string": {
        if (!paragraphStartLoc || !paragraphStartRange) {
          [paragraphStartLoc, paragraphStartRange] = convertPosition(
            node.position
          );
        }
        const strNode = convertInlineNode(node, rawText);
        if (strNode) {
          paragraphChildrenCandidates.push(...strNode);
        }
        break;
      }
      case "group":
      case "mathenv":
      case "parbreak":
      case "environment":
      case "verbatim":
      case "displaymath":
        finalizeParagraph();
        allNodes.push(...convertBlockNode(node, rawText));
        break;
      // root node is not expected in this context.
      case "root":
        throw new Error(
          "Unexpected root node at: " + JSON.stringify(node.position)
        );
    }
    [lastLoc, lastRange] = convertPosition(node.position);
  });
  finalizeParagraph();
  return allNodes;
};

// convertInlineNode converts a LaTeX AST node to inline textlint AST nodes.
export const convertInlineNode = (
  node: LatexAst.Node,
  rawText: string
): PhrasingContent[] => {
  if (!node.position) {
    return [];
  }
  const raw = rawText.slice(
    node.position.start.offset,
    node.position.end.offset
  );
  const [loc, range] = convertPosition(node.position);
  switch (node.type) {
    case "whitespace":
    case "string":
      return [
        {
          type: ASTNodeTypes.Str,
          raw: raw,
          range: range,
          loc: loc,
          value: "content" in node ? node.content : raw,
        },
      ];
    case "comment":
      return [
        {
          type: ASTNodeTypes.Comment,
          raw: raw,
          range: range,
          loc: loc,
          value: node.content,
        },
      ];
    case "parbreak":
      return [
        {
          type: ASTNodeTypes.Break,
          raw: raw,
          range: range,
          loc: loc,
        },
      ];
    case "inlinemath":
    case "verb":
      return [
        {
          type: ASTNodeTypes.Code,
          raw: raw,
          range: range,
          loc: loc,
          value: typeof node.content === "string" ? node.content : raw,
        },
      ];
    case "macro": {
      // macro has only loaction and range for the macro itself.
      // Therefore, we need to calculate the location and range from the arguments of it.
      const [macroLoc, macroRange] = estimateMacroPosition(node) || [
        loc,
        range,
      ];
      const macroRaw = rawText.slice(macroRange[0], macroRange[1]);
      const value = extractStringFromArgs(node, rawText);
      switch (node.content) {
        case "linebreak":
        case "\\":
          return [
            {
              type: ASTNodeTypes.Break,
              raw: macroRaw,
              range: macroRange,
              loc: macroLoc,
            },
          ];
        case "href":
        case "url": {
          let url = "";
          const children = [];
          if (node.args) {
            switch (node.args.length) {
              case 1:
                // url macro has one args
                // 1. URL string
                url = value;
                children.push(asStrNode(node.args[0].content, rawText));
                break;
              case 3:
                // href macro has three args.
                // 1. What's this?.
                // 2. URL string
                // 3. Text to be shown
                url = extractStringFromNodes(node.args[1].content, rawText);
                children.push(asStrNode(node.args[2].content, rawText));
                break;
            }
          }
          return [
            {
              type: ASTNodeTypes.Link,
              raw: macroRaw,
              range: macroRange,
              loc: macroLoc,
              children: children.filter(notNull),
              url: url,
            },
          ];
        }
        case "includegraphics":
          return [
            {
              type: ASTNodeTypes.Image,
              raw: macroRaw,
              range: macroRange,
              loc: macroLoc,
              url: value,
              // Currently, we don't support \caption macro.
              title: value,
            },
          ];
        default:
          if (node.content in inlineMacroTypeMap) {
            return [
              // inlineMacroType is a subset of PhrasingContent.
              // Therefore, we can safely cast it to PhrasingContent.
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              {
                type: inlineMacroTypeMap[node.content],
                raw: macroRaw,
                range: macroRange,
                loc: macroLoc,
                value: value,
              },
            ];
          }
          // Currently, we don't support other macros.
          return [
            {
              type: ASTNodeTypes.Html,
              raw: macroRaw,
              range: macroRange,
              loc: macroLoc,
              value: value,
            },
          ];
      }
    }
    case "group":
    case "environment":
      // Normally, environment is a block node. However, the caller expect it as inline node.
      // We will extract the content of the environment and try to parse them as inline nodes.
      return node.content.flatMap((node) => convertInlineNode(node, rawText));
    default:
      console.error(
        `WARNING: Unexpected node type for InlineNode: ${
          node.type
        } at ${JSON.stringify(node.position)}`
      );
      return [];
  }
};

export const convertBlockNode = (
  node: LatexAst.Node,
  rawText: string
): BlockContent[] => {
  if (!node.position) {
    return [];
  }
  const raw = rawText.slice(
    node.position.start.offset,
    node.position.end.offset
  );
  const [loc, range] = convertPosition(node.position);
  switch (node.type) {
    case "macro": {
      const [macroLoc, macroRange] = estimateMacroPosition(node) || [
        loc,
        range,
      ];
      const args = getArgsContent(node).findLast(notNull) || [];
      if (node.content in headerDepthMap) {
        return [
          {
            type: ASTNodeTypes.Header,
            depth: headerDepthMap[node.content],
            children: args.flatMap((arg) => convertInlineNode(arg, rawText)),
            raw: rawText.slice(macroRange[0], macroRange[1]),
            loc: macroLoc,
            range: macroRange,
          },
        ];
      }
      return [
        {
          type: ASTNodeTypes.Html,
          raw: rawText.slice(macroRange[0], macroRange[1]),
          range: macroRange,
          loc: macroLoc,
          value: extractStringFromArgs(node, rawText),
        },
      ];
    }
    case "environment":
      switch (node.env) {
        case "tabular":
          return [
            {
              type: ASTNodeTypes.Table,
              children: convertRows(node.content, rawText),
              raw: raw,
              loc: loc,
              range: range,
            },
          ];
        case "enumerate":
        case "itemize":
        case "description":
          return [
            {
              type: ASTNodeTypes.List,
              children: convertListItems(node.content, rawText),
              raw: raw,
              loc: loc,
              range: range,
            },
          ];
        case "quote":
        case "quotation":
          return [
            {
              type: ASTNodeTypes.BlockQuote,
              children: convertNodes(node.content, rawText),
              raw: raw,
              loc: loc,
              range: range,
            },
          ];
        case "figure":
          return [
            {
              type: ASTNodeTypes.Paragraph,
              children: convertInlineNode(node, rawText),
              raw: raw,
              loc: loc,
              range: range,
            },
          ];
        // minted is not treated as a `verbatim` environment in unified-latex.
        case "minted":
          return [
            {
              type: ASTNodeTypes.CodeBlock,
              raw: raw,
              range: range,
              loc: loc,
              value: extractStringFromNodes(node.content, rawText),
            },
          ];
        default:
          // environment can contain some block nodes.
          return convertNodes(node.content, rawText);
      }
    case "mathenv":
    case "verbatim":
    case "displaymath":
      return [
        {
          type: ASTNodeTypes.CodeBlock,
          raw: raw,
          range: range,
          loc: loc,
          value: raw,
        },
      ];
    case "parbreak":
      // Ignore. txtlint doesn't assume line break as a block node.
      return [];
    case "group":
      // group contains some nodes. We will convert them to block nodes in this context.
      return convertNodes(node.content, rawText);
    default:
      console.error(
        `WARNING: Unexpected node type for BlockNode: ${
          node.type
        } at ${JSON.stringify(node.position)}`
      );
      return [];
  }
};

export const convertToHTMLOrComment = (
  node: LatexAst.Node,
  rawText: string
): TxtHtmlNode | TxtCommentNode | null => {
  if (!node.position) {
    return null;
  }
  const [loc, range] = convertPosition(node.position);
  switch (node.type) {
    case "macro": {
      const [macroLoc, macroRange] = estimateMacroPosition(node) || [
        loc,
        range,
      ];
      return {
        type: ASTNodeTypes.Html,
        raw: rawText.slice(macroRange[0], macroRange[1]),
        range: macroRange,
        loc: macroLoc,
        value: extractStringFromArgs(node, rawText),
      };
    }
    default: {
      const raw = rawText.slice(range[0], range[1]);
      let content = "";
      if ("content" in node) {
        content =
          typeof node.content === "string" ? node.content : (content = raw);
      }
      return {
        type: node.type == "comment" ? ASTNodeTypes.Comment : ASTNodeTypes.Html,
        raw: raw,
        range: range,
        loc: loc,
        value: content,
      };
    }
  }
};

const convertListItem = (
  node: LatexAst.Node,
  rawText: string
): TxtListItemNode[] => {
  if (!node.position) {
    return [];
  }
  const children: BlockContent[] = [];
  switch (node.type) {
    case "macro": {
      // `\\item` macro is expected.
      // `\\item` macro in `itemize` or `enumerate` environment are as follows:
      //
      // \item content
      //
      // Convert the content of the `itemize` or `enumerate` environment as a paragraph node as follows:
      //
      // - ListItem
      //   - Paragraph(content)
      //
      // `\\item` macro in `description` environment has an additional argument.
      // `description` environment has the following structure:
      //
      // \item[title] content
      //
      // Convert the content of the `description` environment as a paragraph node as follows:
      //
      // - ListItem
      //   - Paragraph(title)
      //   - Paragraph(content)
      const contents = getArgsContent(node);
      if (
        node.content == "item" &&
        contents.length === 4 &&
        notNull(contents[1])
      ) {
        children.push(...convertNodes(contents[1], rawText));
      }
      children.push(...convertNodes(contents.findLast(notNull) || [], rawText));
      break;
    }
    case "whitespace":
      // ignored
      break;
    case "group":
    case "environment":
      // Try to convert the content of the list item in these type of nodes.
      return node.content.flatMap((node) => convertListItem(node, rawText));
    default:
      children.push(...convertNodes([node], rawText));
  }
  // List item node has only position of `\\item`.
  // Therefore, we need to calculate the range of the list item.
  const [startLoc, startRange] = convertPosition(node.position);
  const lastLoc =
    children.length > 0 ? children[children.length - 1].loc : startLoc;
  const lastRange =
    children.length > 0 ? children[children.length - 1].range : startRange;
  return [
    {
      type: ASTNodeTypes.ListItem,
      loc: {
        start: startLoc.start,
        end: lastLoc.end,
      },
      range: [startRange[0], lastRange[1]],
      raw: rawText.slice(startRange[0], lastRange[1]),
      children: children,
    },
  ];
};

const convertListItems = (
  nodes: LatexAst.Node[],
  rawText: string
): TxtListItemNode[] => {
  return nodes.flatMap((node) => convertListItem(node, rawText));
};

const convertCell = (
  nodes: PhrasingContent[],
  rawText: string
): TxtTableCellNode[] => {
  if (nodes.length === 0) {
    return [];
  }
  const lastIdx = nodes.length - 1;
  const [firstLoc, firstRange] = [nodes[0].loc.start, nodes[0].range[0]];
  const [lastLoc, lastRange] = [
    nodes[lastIdx].loc.end,
    nodes[lastIdx].range[1],
  ];
  return [
    {
      type: ASTNodeTypes.TableCell,
      children: nodes.slice(),
      raw: rawText.slice(firstRange, lastRange),
      range: [firstRange, lastRange],
      loc: {
        start: firstLoc,
        end: lastLoc,
      },
    },
  ];
};

const convertRows = (
  nodes: LatexAst.Node[],
  rawText: string
): TableContent[] => {
  const rows: TxtTableRowNode[] = [];
  let cellChildrenCandidates: PhrasingContent[] = [];
  let currentRowChildren: TxtTableCellNode[] = [];
  let rowStartLoc: TxtNodeLocation | null = null;
  let rowStartRange: TxtNodeRange | null = null;
  let rowEndLoc: TxtNodeLocation | null = null;
  let rowEndRange: TxtNodeRange | null = null;
  const finalizeCell = () => {
    currentRowChildren.push(...convertCell(cellChildrenCandidates, rawText));
    cellChildrenCandidates = [];
  };
  const finalizeRow = () => {
    if (
      currentRowChildren.length === 0 ||
      !rowStartRange ||
      !rowStartLoc ||
      !rowEndRange ||
      !rowEndLoc
    ) {
      return;
    }
    rows.push({
      type: ASTNodeTypes.TableRow,
      children: currentRowChildren.slice(),
      raw: rawText.slice(rowStartRange[0], rowEndRange[1]),
      range: [rowStartRange[0], rowEndRange[1]],
      loc: {
        start: rowStartLoc.start,
        end: rowEndLoc.end,
      },
    });
    rowStartLoc = null;
    rowStartRange = null;
    rowEndLoc = null;
    rowEndRange = null;
    currentRowChildren = [];
  };
  nodes.forEach((node) => {
    if (!node.position) {
      return;
    }
    if (!rowStartLoc || !rowStartRange) {
      [rowStartLoc, rowStartRange] = convertPosition(node.position);
    }
    [rowEndLoc, rowEndRange] = convertPosition(node.position);
    switch (node.type) {
      case "macro":
        switch (node.content) {
          case "\\":
          case "linebreak":
            finalizeCell();
            finalizeRow();
            return;
        }
        break;
      case "string":
        if (node.content === "&") {
          finalizeCell();
          return;
        }
        break;
    }
    cellChildrenCandidates.push(...convertInlineNode(node, rawText));
  });
  finalizeCell();
  finalizeRow();
  return rows;
};
