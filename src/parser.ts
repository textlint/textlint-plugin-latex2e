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

import Parsimmon from "parsimmon";
import { ASTNodeTypes, TxtNode } from "@textlint/ast-node-types";
import traverse from "traverse";

interface MacroNode {
  name: string;
  arguments: any[];
}

interface EnvironmentNode {
  name: string;
  arguments: any[];
  body: any;
}

interface Context {
  name: string;
}

const BeginEnvironment = (
  pattern: string,
  context: Context
): Parsimmon.Parser<string> =>
  Parsimmon((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\begin\\{(${pattern})\\}`));
    if (m !== null) {
      context.name = m[1];
      return Parsimmon.makeSuccess(i + m[0].length, m[1]);
    } else {
      return Parsimmon.makeFailure(i, `\\begin{${pattern}}`);
    }
  });

const EndEnvironment = (context: Context): Parsimmon.Parser<null> =>
  Parsimmon((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\end\\{${context.name}\\}`));
    if (m !== null) {
      return Parsimmon.makeSuccess(i + m[0].length, null);
    } else {
      return Parsimmon.makeFailure(i, `\\end{${context.name}}`);
    }
  });

export const LaTeX = Parsimmon.createLanguage({
  Block(r) {
    return r.Program.wrap(Parsimmon.string("{"), Parsimmon.string("}"));
  },
  Environment(r) {
    const context = { name: "" };
    const option = r.Program.wrap(Parsimmon.string("["), Parsimmon.string("]"));
    const argument = r.Program.wrap(
      Parsimmon.string("{"),
      Parsimmon.string("}")
    );
    return Parsimmon.seqObj<EnvironmentNode>(
      ["name", BeginEnvironment(".*?", context)],
      ["arguments", Parsimmon.alt(option, argument).many()],
      ["body", r.Program],
      EndEnvironment(context)
    ).node("environment");
  },
  ListEnvironment(r) {
    const context = { name: "" };
    const option = r.Program.wrap(Parsimmon.string("["), Parsimmon.string("]"));
    const argument = r.Program.wrap(
      Parsimmon.string("{"),
      Parsimmon.string("}")
    );
    const item = Parsimmon.seqObj<MacroNode>(
      ["name", Parsimmon.regex(/\\(i+tem)/, 1)],
      ["arguments", r.Program.map(_ => [_])]
    ).node("macro");
    const body = Parsimmon.seqMap(
      Parsimmon.index,
      item.many(),
      Parsimmon.index,
      (start, items, end) => ({
        end,
        name: "program",
        start,
        value: items
      })
    );
    return Parsimmon.seqObj<EnvironmentNode>(
      ["name", BeginEnvironment("itemize|enumerate", context)],
      ["arguments", Parsimmon.alt(option, argument).many()],
      ["body", body],
      EndEnvironment(context)
    ).node("environment");
  },
  DisplayMathEnvironment(r) {
    const latexStyle = r.Program.wrap(
      Parsimmon.string("\\["),
      Parsimmon.string("\\]")
    );
    const texStyle = r.Program.wrap(
      Parsimmon.string("$$"),
      Parsimmon.string("$$")
    );
    return Parsimmon.seqObj<EnvironmentNode>(
      ["name", Parsimmon.succeed("displaymath")],
      ["arguments", Parsimmon.succeed([])],
      ["body", Parsimmon.alt(latexStyle, texStyle)]
    ).node("environment");
  },
  InlineMathEnvironment(r) {
    const latexStyle = r.Program.wrap(
      Parsimmon.string("\\("),
      Parsimmon.string("\\)")
    );
    const texStyle = r.Program.wrap(
      Parsimmon.string("$"),
      Parsimmon.string("$")
    );
    return Parsimmon.seqObj<EnvironmentNode>(
      ["name", Parsimmon.succeed("displaymath")],
      ["arguments", Parsimmon.succeed([])],
      ["body", Parsimmon.alt(latexStyle, texStyle)]
    ).node("environment");
  },
  Macro(r) {
    const option = Parsimmon.noneOf("]")
      .many()
      .wrap(Parsimmon.string("["), Parsimmon.string("]"))
      .map((_: any) => {
        const opt = _.join();
        return r.Program.tryParse(opt);
      }); // Program eats ] character...
    const argument = r.Program.wrap(
      Parsimmon.string("{"),
      Parsimmon.string("}")
    );
    return Parsimmon.seqObj<MacroNode>(
      [
        "name",
        Parsimmon.regexp(
          /\\(?!begin|end|verbatim|item)([a-zA-Z_@]+|[`'^"~=\.\\ ])/,
          1
        )
      ],
      ["arguments", Parsimmon.alt(option, argument).many()]
    ).node("macro");
  },
  VerbatimMacro() {
    return Parsimmon.seqObj<MacroNode>(
      ["name", Parsimmon.regexp(/\\(verb*?)/, 1)],
      ["arguments", Parsimmon.regexp(/\|.*?\|/, 1).map(_ => [_])]
    ).node("macro");
  },
  Comment() {
    return Parsimmon.regexp(/%([^\n\r]*)/, 1).node("comment");
  },
  EmptyLine() {
    return Parsimmon.newline
      .atLeast(2)
      .map(_ => _.join(""))
      .node("emptyline");
  },
  Program(r) {
    const e = Parsimmon.alt(
      r.DisplayMathEnvironment,
      r.InlineMathEnvironment,
      r.ListEnvironment,
      r.Environment
    );
    const m = Parsimmon.alt(r.VerbatimMacro, r.Macro);
    return Parsimmon.alt(e, m, r.EmptyLine, r.Text, r.Comment, r.Block)
    .many()
      .node("program");
  },
  Text() {
    return Parsimmon.alt(
      Parsimmon.noneOf("$%{}\\\n\r"),
      Parsimmon.newline.notFollowedBy(Parsimmon.newline)
    )
      .atLeast(1)
      .map(_ => _.join(""))
      .node("text");
  }
});

export const TxtAST = {
  parse(text: string) {
    const ast = LaTeX.Program.tryParse(text);
    return traverse(ast).map(function(node) {
      if (
        this.parent &&
        this.parent.node.isDocument &&
        JSON.stringify(this.parent.node.children) === JSON.stringify(node)
      ) {
        const children = [
          {
            ...this.parent.node,
            type: ASTNodeTypes.Paragraph,
            children: [node[0]],
            isDocument: false
          }
        ];
        for (const child of node.slice(1)) {
          if (child.name === "emptyline") {
            children.push(child);
            children.slice(-1)[0].loc.end = {
              line: child.start.line,
              column: child.start.column - 1
            };
            children.slice(-1)[0].range[1] = child.start.offset;
            children.slice(-1)[0].raw = text.slice(
              children.slice(-1)[0].range[0],
              children.slice(-1)[0].range[1]
            );
            children.push({
              type: ASTNodeTypes.Paragraph,
              loc: {
                start: {
                  column: child.end.column - 1,
                  line: child.end.line
                },
                end: {
                  column: 0,
                  line: 0
                }
              },
              range: [child.end.offset, 0],
              raw: "",
              children: []
            });
          } else {
            children.slice(-1)[0].children.push(child);
          }
        }
        children.slice(-1)[0].loc.end = this.parent.node.loc.end;
        children.slice(-1)[0].range[1] = this.parent.node.range[1];
        children.slice(-1)[0].raw = text.slice(
          children.slice(-1)[0].range[0],
          children.slice(-1)[0].range[1]
        );
        this.update(children);
      }
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
                  type: "Unknown",
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
              case "document":
                this.update({
                  ...tmp,
                  type: ASTNodeTypes.Html,
                  children: node.value.arguments.concat(node.value.body),
                  isDocument: true
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
  }
};
