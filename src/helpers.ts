import { Position } from "./types.js";

import {
  ASTNodeTypes,
  TxtNodeLocation,
  TxtNodeRange,
  TxtStrNode,
} from "@textlint/ast-node-types";
import * as LatexAst from "@unified-latex/unified-latex-types";
import { getArgsContent } from "@unified-latex/unified-latex-util-arguments";

export const flattenGroups = (nodes: LatexAst.Node[]): LatexAst.Node[] => {
  return nodes.flatMap((node) => {
    if (node.type === "group") {
      return flattenGroups(node.content);
    }
    return node;
  });
};

export const extractStringFromNodes = (
  nodes: LatexAst.Node[],
  rawText: string,
): string => {
  return nodes
    .map((node): string => {
      switch (node.type) {
        case "string":
          return node.content;
        case "whitespace":
          if (!node.position) {
            return "";
          }
          return rawText.slice(
            node.position.start.offset,
            node.position.end.offset,
          );
        case "macro":
          return extractStringFromArgs(node, rawText);
        case "group":
          return extractStringFromNodes(node.content, rawText);
        default:
          return "";
      }
    })
    .join("");
};

export const extractStringFromArgs = (
  node: LatexAst.Macro | LatexAst.Environment,
  rawText: string,
): string => {
  // Most cases, last argument is the content of the macro to be shown in LaTeX.
  return extractStringFromNodes(
    getArgsContent(node).findLast(notNull) || [],
    rawText,
  );
};

export const asStrNode = (
  nodes: LatexAst.Node[],
  rawText: string,
): TxtStrNode | null => {
  if (nodes.length === 0) {
    return null;
  }
  const firstNode = nodes[0];
  const lastNode = nodes[nodes.length - 1];
  if (!firstNode.position || !lastNode.position) {
    return null;
  }
  const [loc, range] = convertPosition({
    start: firstNode.position.start,
    end: lastNode.position.end,
  });
  return {
    type: ASTNodeTypes.Str,
    raw: rawText.slice(range[0], range[1]),
    range: range,
    loc: loc,
    value: extractStringFromNodes(nodes, rawText),
  };
};

export const convertPosition = (
  position: Position,
): [TxtNodeLocation, TxtNodeRange] => {
  return [
    {
      start: {
        line: position.start.line,
        column: position.start.column,
      },
      end: {
        line: position.end.line,
        column: position.end.column,
      },
    },
    [position.start.offset, position.end.offset],
  ];
};

const estimateArgLength = (arg: LatexAst.Argument): number => {
  let length = 0;
  if (arg.position) {
    length += arg.position.end.offset - arg.position.start.offset;
  }
  length += arg.openMark.length + arg.closeMark.length;
  arg.content.forEach((node) => {
    if (node.type === "macro") {
      length += estimateMacroLength(node);
      return;
    }
    if (node.position) {
      length += node.position.end.offset - node.position.start.offset;
    }
  });
  return length;
};

const estimateMacroLength = (node: LatexAst.Macro): number => {
  let length = 0;
  if (node.position) {
    length += node.position.end.offset - node.position.start.offset;
  }
  if (!node.args || node.args.length === 0) {
    return length;
  }
  length += node.args.reduce((acc, arg): number => {
    return acc + estimateArgLength(arg);
  }, 0);
  return length;
};

export const estimateMacroPosition = (
  node: LatexAst.Macro,
): [TxtNodeLocation, TxtNodeRange] | null => {
  if (!node.position) {
    return null;
  }
  if (!node.args || node.args.length === 0) {
    return convertPosition(node.position);
  }
  const length = estimateMacroLength(node);
  return convertPosition({
    start: node.position.start,
    end: {
      line: node.position.start.line,
      column: node.position.start.column + length,
      offset: node.position.start.offset + length,
    },
  });
};

export const notNull = <T>(value: T | null): value is NonNullable<T> => {
  return value !== null;
};
