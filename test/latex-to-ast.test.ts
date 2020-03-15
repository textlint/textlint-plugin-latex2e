import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { parse } from "../src/latex-to-ast";
import { TextlintKernel } from "@textlint/kernel";
import { AnyTxtNode, ASTNodeTypes } from "@textlint/ast-node-types";

describe("TxtNode AST", () => {
  test("Valid ast", () => {
    const code = `
        \\documentclass{article}
        \\begin{document} Hello
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse empty comment", () => {
    const code = `\\begin{document}
        %
        hoge%
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse display math", () => {
    const code = `\\begin{equation}
          x^2 - 6x + 1 = 0
        \\end{equation}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse inline math", () => {
    const code = `\\begin{document}
          $x^2 = 4$
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("Paragraph should not be nested", () => {
    const code = `\\documentclass{article}
      \\begin{document}
      \\begin{theorem}
      A Cat is cute.
      \\end{theorem}
      \\end{document}
      `;
    function isNested(isParagraph: boolean, node: AnyTxtNode): boolean {
      switch (node.type) {
        case ASTNodeTypes.Paragraph:
          if (isParagraph) {
            return true;
          } else {
            return node.children
              .map((child: AnyTxtNode) => isNested(true, child))
              .reduce((a: boolean, b: boolean) => a || b, false);
          }
        default:
          if ("children" in node) {
            return node.children
              .map((child: AnyTxtNode) => isNested(isParagraph, child))
              .reduce((a: boolean, b: boolean) => a || b, false);
          } else {
            return false;
          }
      }
    }
    ASTTester.test(parse(code));
    expect(isNested(false, parse(code))).toBe(false);
  });
  test("Parse comments", () => {
    const code = `\\begin{document}
          % comment
          abcd
        \\end{document}
        `;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[1].type).toBe(ASTNodeTypes.Paragraph);
  });
  test("Parse comments (outside of document)", () => {
    const code = `
        \\documentclass{article}
        % comment
        \\begin{document}
          abcd
        \\end{document}
        % comment
        `;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(3);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[1].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[2].type).toBe(ASTNodeTypes.Comment);
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
  test("latex code outside of document environment", async () => {
    const input = `I has a pens.`;
    const output = `I have a pen.`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
  test("latex code with comments", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}
          % comment
          I have a pen.
        \\end{document}`;
    const output = `
        \\documentclass{article}
        \\begin{document}
          % comment
          I have a pen.
        \\end{document}`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
  test("latex code with comments (outside of document)", async () => {
    const input = `
        \\documentclass{article}
        % comment
        \\begin{document}
          I have a pen.
        \\end{document}
        % comment`;
    const output = `
        \\documentclass{article}
        % comment
        \\begin{document}
          I have a pen.
        \\end{document}
        % comment`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
});
