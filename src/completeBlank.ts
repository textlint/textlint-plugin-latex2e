/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import { ASTNodeTypes, TxtNode } from "@textlint/ast-node-types";
import calculatePosition from "./calculatePosition";

const completeBlank =
  (text: string) =>
  <T extends TxtNode>(node: T): T => {
    if ("children" in node) {
      if (node.children.length === 0) {
        return node;
      }
      const children = [];
      for (let i = 0; i < node.children.length - 1; i++) {
        const range = [
          node.children[i].range[1],
          node.children[i + 1].range[0],
        ];
        if (range[0] !== range[1]) {
          children.push(completeBlank(text)(node.children[i]));
          children.push({
            loc: {
              start: calculatePosition(text, range[0]),
              end: calculatePosition(text, range[1]),
            },
            range: range,
            raw: text.slice(...range),
            type: ASTNodeTypes.Html,
            value: text.slice(...range),
          });
        } else {
          children.push(completeBlank(text)(node.children[i]));
        }
      }
      children.push(
        completeBlank(text)(node.children[node.children.length - 1])
      );
      return { ...node, children };
    } else {
      return node;
    }
  };

export default completeBlank;
