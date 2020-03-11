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

import { latexParser } from "latex-utensils";
import {
  ASTNodeTypes,
  AnyTxtNode,
  TxtParentNode,
  TxtTextNode,
  TxtNode
} from "@textlint/ast-node-types";

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

const complete = (text: string, node: TxtParentNode): TxtParentNode => {
  const transform = (node: AnyTxtNode): AnyTxtNode => {
    if ("children" in node) {
      const children = [];
      for (let i = 0; i < node.children.length - 1; i++) {
        const range = [
          node.children[i].range[1],
          node.children[i + 1].range[0]
        ];
        if (range[0] !== range[1]) {
          children.push(transform(node.children[i]));
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
      children.push(transform(node.children[node.children.length - 1]));
      return { ...node, children };
    } else {
      return node;
    }
  };
  const children = [];
  for (let i = 0; i < node.children.length - 1; i++) {
    const range: [number, number] = [
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
  return { ...node, children: children.map(transform) };
};

export const parse = (text: string): TxtParentNode => {
  const ast = latexParser.parse(text);
  return complete(text, {
    type: ASTNodeTypes.Document,
    raw: text,
    range: [0, text.length],
    loc: {
      start: {
        line: ast.content[0].location?.start.line || 0,
        column: ast.content[0].location?.start.column || 0
      },
      end: {
        line: ast.content[ast.content.length - 1].location?.end.line || 0,
        column: ast.content[ast.content.length - 1].location?.end.column || 0
      }
    },
    children: ast.content
      .map(function transform(
        node: latexParser.Node
      ): TxtTextNode | TxtNode | null {
        switch (node.kind) {
          case "command":
            switch (node.name) {
              case "textbf":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              case "textit":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              case "institute":
              case "title":
              case "author":
              case "chapter":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              case "section":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              case "subsection":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              case "subsubsection":
                return {
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
                  children: node.args.map(transform).filter(n => n !== null)
                };
              default:
                return null;
            }
          case "command.text":
            return {
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
              children: [node.arg].map(transform).filter(n => n !== null)
            };
          case "env":
            switch (node.name) {
              default:
                return {
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
                    .map(transform)
                    .filter(n => n !== null)
                };
            }
          case "env.lstlisting":
          case "env.verbatim":
          case "env.minted":
            return {
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
            };
          case "env.math.align":
          case "env.math.aligned":
          case "displayMath":
            return {
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
              value: latexParser.stringify(node.content),
              type: ASTNodeTypes.CodeBlock
            };
          case "superscript":
          case "subscript":
            return {
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
              children: [node.arg]
                .map(n => (n !== undefined ? transform(n) : null))
                .filter(n => n !== null)
            };
          case "inlineMath":
          case "math.math_delimiters":
          case "math.matching_delimiters":
            return {
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
              value: latexParser.stringify(node.content),
              type: ASTNodeTypes.Code
            };
          case "verb":
            return {
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
            };
          case "text.string":
            return {
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
            };
          case "arg.group":
            return transform(node.content[0]);
          case "arg.optional":
            return transform(node.content[0]);
          case "parbreak":
          case "ignore":
          case "alignmentTab":
          case "activeCharacter":
          case "math.character":
          case "command.def":
          case "commandParameter":
            return null;
        }
      })
      .map(n => (n !== null ? [n] : []))
      .reduce((a, b) => a.concat(b))
  });
};
