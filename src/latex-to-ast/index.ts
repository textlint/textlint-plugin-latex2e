/*
 * This file is part of textlint-plugin-latex2e
 *
 * Foobar is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Foobar is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Foobar.  If not, see <http://www.gnu.org/licenses/>.
 */

import { LaTeX } from "./latex";
import { ASTNodeTypes, TxtNode } from "@textlint/ast-node-types";
import traverse from "traverse";

export const parse = (text: string) => {
  const ast = LaTeX.Program.tryParse(text);
  return traverse(ast).map(function(node) {
    if (this.notLeaf && node.value) {
      const tmp: TxtNode = {
        loc: {
          end: {
            column: node.end.column - 1,
            line: node.end.line
          },
          start: {
            column: node.start.column - 1,
            line: node.start.line
          }
        },
        range: [node.start.offset, node.end.offset],
        raw: text.slice(node.start.offset, node.end.offset),
        type: "Unknown"
      };
      switch (node.name) {
        case "comment":
          this.update({
            ...tmp,
            type: ASTNodeTypes.Comment,
            value: node.value
          });
          break;
        case "emptyline":
          this.update({ ...tmp, type: ASTNodeTypes.Break });
          break;
        case "text":
          this.update({
            ...tmp,
            type: ASTNodeTypes.Str,
            value: node.value
          });
          break;
        case "macro":
          switch (node.value.name) {
            case "textbf":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Strong,
                children: node.value.arguments
              });
              break;
            case "textit":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Emphasis,
                children: node.value.arguments
              });
              break;
            case "item":
              this.update({
                ...tmp,
                type: ASTNodeTypes.ListItem,
                children: node.value.arguments
              });
              break;
            case "verb":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Code,
                value: node.value.arguments[0]
              });
              break;
            case "verb*":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Code,
                value: node.value.arguments[0]
              });
              break;
            case "section":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Header,
                children: node.value.arguments
              });
              break;
            case "subsection":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Header,
                children: node.value.arguments
              });
              break;
            case "subsubsection":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Header,
                children: node.value.arguments
              });
              break;
            case "chapter":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Header,
                children: node.value.arguments
              });
              break;
            default:
              this.update({
                ...tmp,
                type: ASTNodeTypes.Html,
                children: node.value.arguments
              });
              break;
          }
          break;
        case "environment":
          switch (node.value.name) {
            case "displaymath":
              this.update({
                ...tmp,
                type: ASTNodeTypes.CodeBlock,
                children: node.value.arguments.concat(node.value.body)
              });
              break;
            case "inlinemath":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Code,
                children: node.value.arguments.concat(node.value.body)
              });
              break;
            case "enumerate":
              this.update({
                ...tmp,
                type: ASTNodeTypes.List,
                children: node.value.arguments.concat(node.value.body)
              });
              break;
            case "itemize":
              this.update({
                ...tmp,
                type: ASTNodeTypes.List,
                children: node.value.arguments.concat(node.value.body)
              });
              break;
            case "paragraph":
              this.update({
                ...tmp,
                type: ASTNodeTypes.Paragraph,
                children: node.value.arguments.concat(node.value.body)
              });
              break;
            default:
              this.update({
                ...tmp,
                type: ASTNodeTypes.Html,
                children: node.value.arguments.concat(node.value.body)
              });
          }
          break;
        case "program":
          this.update({
            ...tmp,
            type: this.isRoot ? ASTNodeTypes.Document : ASTNodeTypes.Html,
            children: node.value
          });
          break;
      }
    }
  });
};
