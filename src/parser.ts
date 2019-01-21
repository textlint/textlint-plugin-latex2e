import Parsimmon from "parsimmon";
import { ASTNodeTypes } from "@textlint/ast-node-types";
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

const BeginEnvironment = (
  pattern: string,
  environment: { name: string }
): Parsimmon.Parser<string> =>
  Parsimmon((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\begin\\{(${pattern})\\}`));
    if (m !== null) {
      environment.name = m[1];
      return Parsimmon.makeSuccess(i + m[0].length, m[1]);
    } else {
      return Parsimmon.makeFailure(i, `\\begin{${pattern}}`);
    }
  });

const EndEnvironment = (environment: {
  name: string;
}): Parsimmon.Parser<null> =>
  Parsimmon((input, i) => {
    const m = input
      .slice(i)
      .match(new RegExp(`^\\\\end\\{${environment.name}\\}`));
    if (m !== null) {
      return Parsimmon.makeSuccess(i + m[0].length, null);
    } else {
      return Parsimmon.makeFailure(i, `\\end{${environment.name}}`);
    }
  });

export const LaTeX = Parsimmon.createLanguage({
  Environment(r) {
    const environment = { name: "" };
    const option = r.Program.wrap(Parsimmon.string("["), Parsimmon.string("]"));
    const argument = r.Program.wrap(
      Parsimmon.string("{"),
      Parsimmon.string("}")
    );
    return Parsimmon.seqObj<EnvironmentNode>(
      ["name", BeginEnvironment(".*?", environment)],
      ["arguments", Parsimmon.alt(option, argument).many()],
      ["body", r.Program],
      EndEnvironment(environment)
    ).node("environment");
  },
  ListEnvironment(r) {
    const environment = { name: "" };
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
      ["name", BeginEnvironment("itemize|enumerate", environment)],
      ["arguments", Parsimmon.alt(option, argument).many()],
      ["body", body],
      EndEnvironment(environment)
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
    const option = r.Program.wrap(Parsimmon.string("["), Parsimmon.string("]"));
    const argument = r.Program.wrap(
      Parsimmon.string("{"),
      Parsimmon.string("}")
    );
    return Parsimmon.seqObj<MacroNode>(
      [
        "name",
        Parsimmon.regexp(
          /\\(?!begin|end|verbatim|item)([a-zA-Z_@]+|`'^"~=\.)/,
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
    return Parsimmon.regexp(/%([^\n\r]+)/, 1).node("comment");
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
    return Parsimmon.alt(e, m, r.EmptyLine, r.Text, r.Comment)
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
      if (this.notLeaf && node.value) {
        const loc = {
          end: {
            column: node.end.column - 1,
            line: node.end.line
          },
          start: {
            column: node.start.column - 1,
            line: node.start.line
          }
        };
        const range = [node.start.offset, node.end.offset];
        const raw = text.slice(node.start.offset, node.end.offset);
        let type = "Unknown";
        switch (node.name) {
          case "comment":
            this.update({
              loc,
              raw,
              range,
              type: ASTNodeTypes.Comment,
              value: node.value
            });
            break;
          case "emptyline":
            this.update({ loc, raw, range, type: ASTNodeTypes.Break });
            break;
          case "text":
            this.update({
              loc,
              raw,
              range,
              type: ASTNodeTypes.Str,
              value: node.value
            });
            break;
          case "macro":
            switch (node.value.name) {
              case "textbf":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Strong,
                  children: node.value.arguments
                });
                break;
              case "textit":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Emphasis,
                  children: node.value.arguments
                });
                break;
              case "item":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.ListItem,
                  children: node.value.arguments
                });
                break;
              case "verb":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Code,
                  value: node.value.arguments[0]
                });
                break;
              case "verb*":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Code,
                  value: node.value.arguments[0]
                });
                break;
              case "section":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Header,
                  children: node.value.arguments
                });
                break;
              case "subsection":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Header,
                  children: node.value.arguments
                });
                break;
              case "subsubsection":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Header,
                  children: node.value.arguments
                });
                break;
              case "chapter":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Header,
                  children: node.value.arguments
                });
                break;
              default:
                this.update({
                  loc,
                  raw,
                  range,
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
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.CodeBlock,
                  children: node.value.arguments.concat(node.value.body)
                });
                break;
              case "inlinemath":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.Code,
                  children: node.value.arguments.concat(node.value.body)
                });
                break;
              case "enumerate":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.List,
                  children: node.value.arguments.concat(node.value.body)
                });
                break;
              case "itemize":
                this.update({
                  loc,
                  raw,
                  range,
                  type: ASTNodeTypes.List,
                  children: node.value.arguments.concat(node.value.body)
                });
                break;
              default:
                this.update({
                  loc,
                  raw,
                  range,
                  type: "Unknown",
                  children: node.value.arguments.concat(node.value.body)
                });
            }
            break;
          case "program":
            this.update({
              loc,
              raw,
              range,
              type: this.isRoot ? ASTNodeTypes.Document : "Unknown",
              children: node.value
            });
            break;
        }
      }
    });
  }
};
