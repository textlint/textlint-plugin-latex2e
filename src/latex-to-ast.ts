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
import { completeComments } from "./completeComment";
import { complete } from "./complete";

const normalize = (ast: latexParser.LatexAst): latexParser.LatexAst => ({
  ...ast,
  content: ast.content
    .map(node =>
      node.kind === "env" && node.name === "document" ? node.content : [node]
    )
    .reduce((a, b) => [...a, ...b], [])
});

const paragraphize = (rootNode: TxtParentNode): TxtParentNode => {
  let paragraph: AnyTxtNode[] = [];
  const children: AnyTxtNode[] = [];
  for (const node of rootNode.children) {
    if (node.type === "parbreak") {
      children.push({
        loc: {
          start: {
            line: paragraph[0].loc.start.line,
            column: paragraph[0].loc.start.column
          },
          end: {
            line: paragraph[paragraph.length - 1].loc.end.line,
            column: paragraph[paragraph.length - 1].loc.end.column
          }
        },
        range: [
          paragraph[0].range[0],
          paragraph[paragraph.length - 1].range[1]
        ],
        raw: rootNode.raw.slice(
          paragraph[0].range[0],
          paragraph[paragraph.length - 1].range[1]
        ),
        type: ASTNodeTypes.Paragraph,
        children: paragraph
      });
      paragraph = [];
    } else {
      paragraph.push(node);
    }
  }
  if (paragraph.length > 0) {
    children.push({
    loc: {
      start: {
        line: paragraph[0].loc.start.line,
        column: paragraph[0].loc.start.column
      },
      end: {
        line: paragraph[paragraph.length - 1].loc.end.line,
        column: paragraph[paragraph.length - 1].loc.end.column
      }
    },
    range: [paragraph[0].range[0], paragraph[paragraph.length - 1].range[1]],
    raw: rootNode.raw.slice(
      paragraph[0].range[0],
      paragraph[paragraph.length - 1].range[1]
    ),
    type: ASTNodeTypes.Paragraph,
    children: paragraph
    });
  }
  return { ...rootNode, children };
};

export const parse = (text: string): TxtParentNode => {
  const parserOpt = {
    startRule: "Root",
    enableComment: true,
    tracer: undefined,
    // TODO: Add timeout option
    timeout: undefined
  };
  const ast = normalize(latexParser.parse(text, parserOpt));
  const comments = ast.comment ? ast.comment : [];
  // TODO: Refactoring
  return completeComments(
    paragraphize(
      complete(text, {
        type: ASTNodeTypes.Document,
        raw: text,
        range: [0, text.length],
        loc: {
          start: {
            line: ast.content[0].location?.start.line || 0,
            column: (ast.content[0].location?.start.column || 0) - 1
          },
          end: {
            line: ast.content[ast.content.length - 1].location?.end.line || 0,
            column:
              (ast.content[ast.content.length - 1].location?.end.column || 0) -
              1
          }
        },
        children: ast.content
          .map(function transform(
            node: latexParser.Node
          ): (TxtTextNode | TxtNode)[] {
            switch (node.kind) {
              case "command":
                switch (node.name) {
                  case "textbf":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Strong,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "textit":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Emphasis,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "institute":
                  case "title":
                  case "author":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Header,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "chapter":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Header,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "section":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Header,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "subsection":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Header,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  case "subsubsection":
                    return [
                      {
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
                        range: [
                          node.location.start.offset,
                          node.location.end.offset
                        ],
                        raw: text.slice(
                          node.location.start.offset,
                          node.location.end.offset
                        ),
                        type: ASTNodeTypes.Header,
                        children: node.args
                          .map(transform)
                          .reduce((a, b) => [...a, ...b], [])
                      }
                    ];
                  default:
                    return [];
                }
              case "command.text":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: ASTNodeTypes.Str,
                    children: transform(node.arg)
                  }
                ];
              case "env":
                switch (node.name) {
                  default:
                    return [...node.args, ...node.content]
                      .map(transform)
                      .reduce((a, b) => [...a, ...b], []);
                }
              case "env.lstlisting":
              case "env.verbatim":
              case "env.minted":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: ASTNodeTypes.CodeBlock,
                    value: node.content
                  }
                ];
              case "env.math.align":
              case "env.math.aligned":
              case "displayMath":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    value: text.slice(
                      node.content[0].location?.start.offset,
                      node.content[node.content.length - 1].location?.end.offset
                    ),
                    type: ASTNodeTypes.CodeBlock
                  }
                ];
              case "superscript":
              case "subscript":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: ASTNodeTypes.Code,
                    children: node.arg === undefined ? [] : transform(node.arg)
                  }
                ];
              case "inlineMath":
              case "math.math_delimiters":
              case "math.matching_delimiters":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    value: text.slice(
                      node.content[0].location?.start.offset,
                      node.content[node.content.length - 1].location?.end.offset
                    ),
                    type: ASTNodeTypes.Code
                  }
                ];
              case "verb":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: ASTNodeTypes.Code,
                    value: node.content
                  }
                ];
              case "text.string":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: ASTNodeTypes.Str,
                    value: node.content
                  }
                ];
              case "arg.group":
                return node.content
                  .map(transform)
                  .reduce((a, b) => [...a, ...b]);
              case "arg.optional":
                return node.content
                  .map(transform)
                  .reduce((a, b) => [...a, ...b]);
              case "parbreak":
                return [
                  {
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
                    range: [
                      node.location.start.offset,
                      node.location.end.offset
                    ],
                    raw: text.slice(
                      node.location.start.offset,
                      node.location.end.offset
                    ),
                    type: "parbreak"
                  }
                ];
              case "ignore":
              case "alignmentTab":
              case "activeCharacter":
              case "math.character":
              case "command.def":
              case "commandParameter":
                return [];
            }
          })
          .reduce((a, b) => [...a, ...b], [])
      })
    ),
    comments,
    text
  );
};
