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

// Remove null from node
const clean = (node: any): any => {
  if (Array.isArray(node)) {
    return node.filter(x => x !== null).map(clean);
  } else if (typeof node === "object") {
    return Object.entries(node)
      .map(([key, value]) => ({ [key]: clean(value) }))
      .reduce((a, b) => Object.assign(a, b));
  } else {
    return node;
  }
};

const caculatePosition = (text: string, nchar: number) => {
  let nl = 0,
    nc = 0;
  for (let i = 0; i < nchar; i++) {
    nl += text[i] === "\n" ? 1 : 0;
    nc += text[i] === "\n" ? 0 : 1;
  }
  return { line: nl, column: nc };
};

// Complete lacked node
const complete = (text: string, ast: any): any => {
  return traverse(ast).map(function(node: any) {
    if (typeof node === "object" && "children" in node) {
      const children = [];
      for (let i = 0; i < node.children.length - 1; i++) {
        const range = [
          node.children[i].range[1],
          node.children[i + 1].range[0]
        ];
        if (range[0] !== range[1]) {
          children.push(node.children[i]);
          children.push({
            loc: {
              start: caculatePosition(text, range[0]),
              end: caculatePosition(text, range[1])
            },
            range: range,
            raw: text.slice(...range),
            type: ASTNodeTypes.Html,
            value: text.slice(...range)
          });
        }
      }
      children.push(node.children[node.children.length - 1]);
      this.update({ ...node, children });
    }
  });
};

export const parse = (text: string): any => {
  let ast = latexParser.parse(text);
  ast = traverse(ast.content).map(function(node: latexParser.Node | Location) {
    if (typeof node === "object" && "kind" in node) {
      // Skip translation if node is an instance of Location
      switch (node.kind) {
        case "command":
          switch (node.name) {
            case "textbf":
              this.update({
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
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
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
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
              this.update({
                depth: 1,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
              });
              break;
            case "section":
              this.update({
                depth: 2,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
              });
              break;
            case "subsection":
              this.update({
                depth: 3,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
              });
              break;
            case "subsubsection":
              this.update({
                depth: 4,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1
                  }
                },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1
              }
            },
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
  });
  return complete(text, clean(ast)[0]);
};
