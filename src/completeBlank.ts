/*
 * This file is part of textlint-plugin-latex2e
 *
 * textlint-plugin-latex2e is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * textlint-plugin-latex2e is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with textlint-plugin-latex2e.  If not, see <http://www.gnu.org/licenses/>.
 */

import { ASTNodeTypes, TxtNode } from "@textlint/ast-node-types";
import calculatePosition from "./calculatePosition";

const completeBlank = (text: string) => <T extends TxtNode>(node: T): T => {
  if ("children" in node) {
    const children = [];
    for (let i = 0; i < node.children.length - 1; i++) {
      const range = [node.children[i].range[1], node.children[i + 1].range[0]];
      if (range[0] !== range[1]) {
        children.push(completeBlank(text)(node.children[i]));
        children.push({
          loc: {
            start: calculatePosition(text, range[0]),
            end: calculatePosition(text, range[1])
          },
          range: range,
          raw: text.slice(...range),
          type: ASTNodeTypes.Html,
          value: text.slice(...range)
        });
      } else {
        children.push(completeBlank(text)(node.children[i]));
      }
    }
    children.push(completeBlank(text)(node.children[node.children.length - 1]));
    return { ...node, children };
  } else {
    return node;
  }
};

export default completeBlank;
