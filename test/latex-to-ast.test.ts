import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { parse } from "../src/latex-to-ast";
import { TextlintKernel } from "@textlint/kernel";

describe("TxtNode AST", () => {
  test("valid ast", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("parse empty comment", async () => {
    const code = `\\begin{document}
        %
        hoge%
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse display math", async () => {
    const code = `\\begin{equation}
          x^2 - 6x + 1 = 0
        \\end{equation}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse inline math", async () => {
    const code = `\\begin{document}
          $x^2 = 4$
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
});

describe("Fixing document", () => {
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

        \\hoge
        I has a pens.
        \\end{document}
        `;
    const output = `
        \\documentclass{article}
        \\begin{document}
        I have a pen.

        \\hoge
        I have a pen.
        \\end{document}
        `;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });

  test("latex code one line", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}I has a pens.\\end{document}
        `;
    const output = `
        \\documentclass{article}
        \\begin{document}I have a pen.\\end{document}
        `;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
});
