/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import { latexParser } from "latex-utensils";
import {
  ASTNodeTypes,
  TxtParentNode,
  TxtTextNode,
  TxtNode,
} from "@textlint/ast-node-types";
import { completeComments } from "./completeComment";
import completeBlank from "./completeBlank";
import paragraphize from "./paragraphize";
import calculatePosition from "./calculatePosition";
import { pipe } from "fp-ts/lib/pipeable";
import { tuple } from "fp-ts/lib/function";

const normalize = (latexAst: latexParser.LatexAst): latexParser.LatexAst => ({
  ...latexAst,
  content: latexAst.content
    .map((node) =>
      node.kind === "env" && node.name === "document" ? node.content : [node]
    )
    .reduce((a, b) => [...a, ...b], []),
});

const transform =
  (text: string) =>
  (node: latexParser.Node): (TxtTextNode | TxtNode)[] => {
    switch (node.kind) {
      case "command":
        switch (node.name) {
          case "textbf":
            return [
              {
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Strong,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "textit":
            return [
              {
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Emphasis,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "institute":
          case "title":
          case "author":
            return [
              {
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "chapter":
            return [
              {
                depth: 1,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "section":
            return [
              {
                depth: 2,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "subsection":
            return [
              {
                depth: 3,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
            ];
          case "subsubsection":
            return [
              {
                depth: 4,
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                type: ASTNodeTypes.Header,
                children: node.args
                  .map(transform(text))
                  .reduce((a, b) => [...a, ...b], []),
              },
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
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.Str,
            children: transform(text)(node.arg),
          },
        ];
      case "env":
        switch (node.name) {
          case "itemize":
          case "enumerate":
          case "description":
            return [...node.args, ...node.content]
              .map(transformListItems(text))
              .reduce((a, b) => [...a, ...b], []);
          default:
            return [...node.args, ...node.content]
              .map(transform(text))
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
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.CodeBlock,
            value: node.content,
          },
        ];
      case "env.math.align":
      case "env.math.aligned":
      case "displayMath":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            value: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.CodeBlock,
          },
        ];
      case "superscript":
      case "subscript":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.Code,
            children: node.arg === undefined ? [] : transform(text)(node.arg),
          },
        ];
      case "inlineMath":
      case "math.math_delimiters":
      case "math.matching_delimiters":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            value: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.Code,
          },
        ];
      case "verb":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.Code,
            value: node.content,
          },
        ];
      case "text.string":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: ASTNodeTypes.Str,
            value: node.content,
          },
        ];
      case "arg.group":
        return node.content
          .map(transform(text))
          .reduce((a, b) => [...a, ...b], []);
      case "arg.optional":
        return node.content
          .map(transform(text))
          .reduce((a, b) => [...a, ...b], []);
      case "parbreak":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            type: "parbreak",
          },
        ];
      case "command.url":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            url: node.url,
            type: ASTNodeTypes.Link,
            children: [
              {
                loc: {
                  start: {
                    line: node.location.start.line,
                    column: node.location.start.column - 1,
                  },
                  end: {
                    line: node.location.end.line,
                    column: node.location.end.column - 1,
                  },
                },
                range: [node.location.start.offset, node.location.end.offset],
                raw: text.slice(
                  node.location.start.offset,
                  node.location.end.offset
                ),
                value: node.url,
                type: ASTNodeTypes.Str,
              },
            ],
          },
        ];
      case "command.href":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            url: node.url,
            type: ASTNodeTypes.Link,
            children: node.content
              .map(transform(text))
              .reduce((a, b) => [...a, ...b], []),
          },
        ];
      case "command.label":
        return [
          {
            loc: {
              start: {
                line: node.location.start.line,
                column: node.location.start.column - 1,
              },
              end: {
                line: node.location.end.line,
                column: node.location.end.column - 1,
              },
            },
            range: [node.location.start.offset, node.location.end.offset],
            raw: text.slice(
              node.location.start.offset,
              node.location.end.offset
            ),
            value: node.label,
            type: ASTNodeTypes.Html,
          },
        ];
      case "ignore":
      case "alignmentTab":
      case "activeCharacter":
      case "math.character":
      case "command.def":
      case "commandParameter":
        return [];
      default:
        return [];
    }
  };

const transformListItems =
  (text: string) =>
  (node: latexParser.Node): (TxtTextNode | TxtNode)[] => {
    if (node.kind === "math.character" || node.kind === "parbreak") {
      return [];
    }
    const isItemCommand = node.kind === "command" && node.name === "item";
    const nodeType = isItemCommand ? ASTNodeTypes.Html : ASTNodeTypes.ListItem;
    return [
      {
        loc: {
          start: {
            line: node.location.start.line,
            column: node.location.start.column - 1,
          },
          end: {
            line: node.location.end.line,
            column: node.location.end.column - 1,
          },
        },
        range: [node.location.start.offset, node.location.end.offset],
        raw: text.slice(node.location.start.offset, node.location.end.offset),
        type: nodeType,
        children: transform(text)(node),
      },
    ];
  };

export const parse = (text: string): TxtParentNode => {
  const parserOpt = {
    startRule: "Root",
    enableComment: true,
    tracer: undefined,
    // TODO: Add timeout option
    timeout: undefined,
  };
  const latexAst = normalize(latexParser.parse(text, parserOpt));
  const comments = latexAst.comment ? latexAst.comment : [];
  // TODO: Refactoring
  return pipe(
    {
      type: ASTNodeTypes.Document,
      raw: text,
      range: tuple(0, text.length),
      loc: {
        start: calculatePosition(text, 0),
        end: calculatePosition(text, text.length - 1),
      },
      children: latexAst.content
        .map(transform(text))
        .reduce((a, b) => [...a, ...b], []),
    },
    paragraphize,
    completeComments(comments)(text),
    completeBlank(text)
  );
};
