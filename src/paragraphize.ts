/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import {
  ASTNodeTypes,
  AnyTxtNode,
  TxtParentNode,
} from "@textlint/ast-node-types";
import { head, array, last } from "fp-ts/lib/Array";
import { option, map } from "fp-ts/lib/Option";
import { pipe } from "fp-ts/lib/pipeable";

export default (rootNode: TxtParentNode): TxtParentNode => {
  const children: AnyTxtNode[] = [];
  const pushChild = (paragraph: AnyTxtNode[]) => {
    pipe(
      [head(paragraph), last(paragraph)],
      array.sequence(option),
      map(([headNode, lastNode]) => {
        children.push({
          loc: {
            start: headNode.loc.start,
            end: lastNode.loc.end,
          },
          range: [headNode.range[0], lastNode.range[1]],
          raw: rootNode.raw.slice(headNode.range[0], lastNode.range[1]),
          type: ASTNodeTypes.Paragraph,
          children: paragraph,
        });
      })
    );
  };
  let paragraph: AnyTxtNode[] = [];
  for (const node of rootNode.children) {
    switch (node.type) {
      case ASTNodeTypes.CodeBlock:
      case ASTNodeTypes.Header:
      case ASTNodeTypes.HtmlBlock:
        pushChild(paragraph);
        paragraph = [];
        children.push(node);
        break;
      case "parbreak":
        pushChild(paragraph);
        paragraph = [];
        break;
      default:
        paragraph.push(node);
    }
  }
  pushChild(paragraph);
  return { ...rootNode, children };
};
