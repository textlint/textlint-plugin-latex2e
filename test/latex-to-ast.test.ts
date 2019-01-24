import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { parse } from "../src/latex-to-ast";
import { LaTeX } from "../src/latex-to-ast/latex";
import { TextlintKernel } from "@textlint/kernel";

const debug = (x: any) => console.log(JSON.stringify(x, null, 2));

describe("Parsimmon AST", async () => {
  test("non-null", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
    //debug(code);
    //debug(LaTeX.Program.tryParse(code));
    expect(LaTeX.Program.tryParse(code)).toBeTruthy();
  });

  test("comment", async () => {
    const code = `%comment`;
    expect(LaTeX.Program.tryParse(code)).toEqual({
      end: {
        column: 9,
        line: 1,
        offset: 8
      },
      name: "program",
      start: {
        column: 1,
        line: 1,
        offset: 0
      },
      value: [
        {
          end: {
            column: 9,
            line: 1,
            offset: 8
          },
          name: "comment",
          start: {
            column: 1,
            line: 1,
            offset: 0
          },
          value: "comment"
        }
      ]
    });
  });
  test("Counting items", async () => {
    const code = `\\begin{itemize}

            \\item 1 \\command

            \\item \\command 2

        \\end{itemize}`;
    const ast = LaTeX.Program.tryParse(code);
    expect(ast.value[0].value.body.value.length).toBe(2);
  });
});

describe("TxtNode AST", async () => {
  test("valid ast", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
    //process.stdout.write(JSON.stringify(TxtAST.parse(code), null, 2));
    ASTTester.test(parse(code));
  });
});

describe("Fixing document", async () => {
  const kernel = new TextlintKernel();
  const options = {
    filePath: "<test>",
    plugins: [
      { pluginId: "latex2e", plugin: require("../src").default },
      {
        pluginId: "markdown",
        plugin: require("@textlint/textlint-plugin-markdown")
      }
    ],
    rules: [
      {
        ruleId: "spellcheck-tech-word",
        rule: require("textlint-rule-spellcheck-tech-word")
      },
      {
        ruleId: "ginger",
        rule: require("textlint-rule-ginger").default
      }
    ]
  };
  test("latex code", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}
        I has a pens.
        \\end{document}
        `;
    const output = `
        \\documentclass{article}
        \\begin{document}
        I have a pen.
        \\end{document}
        `;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
});
