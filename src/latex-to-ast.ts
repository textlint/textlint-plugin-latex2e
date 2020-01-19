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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with textlint-plugin-latex2e.  If not, see <http://www.gnu.org/licenses/>.
 */

import { Location } from "latex-utensils/out/src/pegjs/pegjs_types";
import { latexParser } from "latex-utensils";
import traverse from "traverse";
import { ASTNodeTypes } from "@textlint/ast-node-types";

export const parse = (text: string): any => {
  const ast = latexParser.parse(text);
  traverse(ast.content).map(function(node: latexParser.Node | Location) {
    if ('kind' in node) { // Skip translation if node is an instance of Location
      switch (node.kind) {
        case "command":
          switch (node.name) {
            case "textbf":
              this.update({
                loc: node.location,
                type: ASTNodeTypes.Strong,
                children: node.args
              });
              break;
            case "textit":
              this.update({
                loc: node.location,
                type: ASTNodeTypes.Emphasis,
                children: node.args
              });
              break;
          }
          break;
        case "verb":
          this.update({
            loc: node.location,
            type: ASTNodeTypes.Code,
            value: node.content
          });
          break;
        case "command.text":
          this.update({
            loc: node.location,
            type: ASTNodeTypes.Paragraph,
            children: [node.arg]
          });
          break;
        case "env.verbatim":
          this.update({
            loc: node.location,
            type: ASTNodeTypes.CodeBlock,
            value: node.content
          });
          break;
        case "env.minted":
          this.update({
            loc: node.location,
            type: ASTNodeTypes.CodeBlock,
            value: node.content
          });
          break;
      }
    }
  });
}
