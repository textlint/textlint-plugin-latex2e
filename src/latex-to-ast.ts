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

const clean = (node: any): any => {
  if (Array.isArray(node)) {
    return node.filter(x => x).map(clean);
  } else if (typeof node === "object") {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => [key, clean(value)])
    );
  } else {
    return node;
  }
};

export const parse = (text: string): any => {
  const ast = latexParser.parse(text);
  return clean(
    traverse(ast.content).map(function(node: latexParser.Node | Location) {
      if (typeof node == "object" && "kind" in node) {
        // Skip translation if node is an instance of Location
        switch (node.kind) {
          case "command":
            switch (node.name) {
              case "textbf":
                this.update({
                  loc: node.location,
                  range: [node.location.start.offset, node.location.end.offset],
                  raw: text.slice(
                    node.location.start.offset,
                    node.location.end.offset
                  ),
                  type: ASTNodeTypes.Strong,
                  children: node.args
                });
                break;
              case "textit":
                this.update({
                  loc: node.location,
                  range: [node.location.start.offset, node.location.end.offset],
                  raw: text.slice(
                    node.location.start.offset,
                    node.location.end.offset
                  ),
                  type: ASTNodeTypes.Emphasis,
                  children: node.args
                });
                break;
              case "institute":
              case "title":
              case "author":
              case "chapter":
              case "section":
              case "subsection":
              case "subsubsection":
                this.update({
                  loc: node.location,
                  range: [node.location.start.offset, node.location.end.offset],
                  raw: text.slice(
                    node.location.start.offset,
                    node.location.end.offset
                  ),
                  type: ASTNodeTypes.Header,
                  children: node.args
                });
                break;
              default:
                this.update(null);
                break;
            }
            break;
          case "command.text":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.Paragraph,
              children: [node.arg]
            });
            break;
          case "env":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.Paragraph,
              children: [...node.args, ...node.content]
            });
            break;
          case "env.lstlisting":
          case "env.verbatim":
          case "env.minted":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.CodeBlock,
              value: node.content
            });
            break;
          case "env.math.align":
          case "env.math.aligned":
          case "displayMath":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.CodeBlock,
              children: node.content
            });
            break;
          case "inlineMath":
          case "subscript":
          case "superscript":
          case "math.matching_paren":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.Code,
              children: node.content
            });
            break;
          case "verb":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.Code,
              value: node.content
            });
            break;
          case "text.string":
            this.update({
              loc: node.location,
              range: [node.location.start.offset, node.location.end.offset],
              raw: text.slice(
                node.location.start.offset,
                node.location.end.offset
              ),
              type: ASTNodeTypes.Str,
              value: node.content
            });
            break;
          case "arg.group":
            this.update(node.content[0]);
            break;
          case "arg.optional":
            this.update(node.content[0]);
            break;
          case "parbreak":
          case "ignore":
          case "alignmentTab":
          case "activeCharacter":
          case "math.character":
          case "command.def":
          case "commandParameter":
            this.update(null);
            break;
        }
      }
    })
  );
};
