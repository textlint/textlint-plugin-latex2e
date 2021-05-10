/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import { latexParser } from "latex-utensils";
import {
  ASTNodeTypes,
  AnyTxtNode,
  TxtNode,
  TxtParentNode,
  TextNodeRange,
} from "@textlint/ast-node-types";

export const convertCommentToTxtNode = (
  rawText: string,
  comments?: latexParser.Comment[] | null
): TxtNode[] => {
  if (!comments) {
    return [];
  }
  return comments?.map((comment: latexParser.Comment): TxtNode => {
    return {
      loc: {
        start: {
          line: comment.location.start.line,
          column: comment.location.start.column - 1,
        },
        end: {
          line: comment.location.end.line,
          column: comment.location.end.column - 1,
        },
      },
      range: [comment.location.start.offset, comment.location.end.offset],
      raw: rawText.slice(
        comment.location.start.offset,
        comment.location.end.offset
      ),
      value: comment.content,
      type: ASTNodeTypes.Comment,
    };
  });
};

export const isAppearedBeforeNode = (
  nodeRange: TextNodeRange,
  commentRange: TextNodeRange
): boolean => {
  return nodeRange[0] >= commentRange[1];
};

export const isIncludedByNode = (
  nodeRange: TextNodeRange,
  commentRange: TextNodeRange
): boolean => {
  return nodeRange[0] <= commentRange[0] && nodeRange[1] >= commentRange[1];
};

export const isParentNode = (node: TxtNode): node is TxtParentNode => {
  const children = node.children;
  return (
    typeof node === "object" &&
    children !== undefined &&
    Array.isArray(children)
  );
};

export const insertComment = (
  comment: TxtNode,
  nodes?: AnyTxtNode[]
): AnyTxtNode[] => {
  if (!nodes) {
    return insertComment(comment, []);
  }
  for (let i = 0; i < nodes.length; i++) {
    // If the comment is appeared before the node, insert it before the node.
    if (isAppearedBeforeNode(nodes[i].range, comment.range)) {
      nodes.splice(i, 0, comment);
      return nodes;
    }
    // If the comment is included in the node, try to insert it recursively.
    if (isIncludedByNode(nodes[i].range, comment.range)) {
      if (isParentNode(nodes[i])) {
        nodes[i].children = insertComment(comment, nodes[i].children);
        return nodes;
      }
      switch (nodes[i].type) {
        case ASTNodeTypes.Code:
        case ASTNodeTypes.CodeBlock:
          // Ignore comments in CodeBlock.
          // This behavior is as same as the reference plugin(Markdown).
          return nodes;
        default:
          // `Parbreak` has no children, even though the range of
          // `Parbreak` includes the range of comment
          // if comment is surrounding by the line break.
          // But the parbreak becomes null, so this condition does not used.
          throw Error("Unexpected node is given. Is the syntax correct?");
      }
    }
  }
  // If the comment is not inserted, it would be appeared after all nodes.
  nodes.push(comment);
  return nodes;
};

// Mapping all comments to the given AST.
export const completeComments =
  (comments: latexParser.Comment[]) =>
  (rawText: string) =>
  (root: TxtParentNode): TxtParentNode => {
    if (comments.length === 0) {
      return root;
    }
    const textlintComments = convertCommentToTxtNode(rawText, comments);
    const copiedRoot = JSON.parse(JSON.stringify(root));
    for (const comment of textlintComments) {
      copiedRoot.children = insertComment(comment, copiedRoot.children);
    }
    return copiedRoot;
  };
