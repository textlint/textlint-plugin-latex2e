import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { parse } from "../src/latex-to-ast";
import { TextlintKernel } from "@textlint/kernel";
import { AnyTxtNode, ASTNodeTypes } from "@textlint/ast-node-types";

describe("TxtNode AST", () => {
  test("Issue 42: TypeError is occurred if `Parbreak` node appears before the first appearance of actual sentence", () => {
    const code1 = `
        \\documentclass{article}
        
        \\begin{document}
          \\begin{abstract}
            abcd
          \\end{abstract}
        \\end{document}
        `;
    const code2 = `
        \\documentclass{article}
        \\begin{document}
        
          \\begin{abstract}
            abcd
          \\end{abstract}
        \\end{document}
        `;
    ASTTester.test(parse(code1));
    ASTTester.test(parse(code2));
  });
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
        \\[
            x^2 -6x + 1 = 0
        \\]
        `;
    ASTTester.test(parse(code));
  });
  test("Parse inline math", () => {
    const code = `\\begin{document}
          $x^2 = 4$
          \\( x^2 = 4 \\)
          \\begin{math} x^2 = 4 \\end{math}
        \\end{document}
        `;
    ASTTester.test(parse(code));
  });
  test("Parse elements of itemize, enumerate, description as ListItem", () => {
    const code = `\\begin{document}
    \\begin{itemize}
      \\item item1
      \\item item2
      \\begin{enumerate}
        \\item item3
      \\end{enumerate}
    \\end{itemize}
    \\end{document}`;
    const parsedAst = parse(code);
    ASTTester.test(parsedAst);
    expect(parsedAst.children[0].children[0].type).toBe("ListItem");
    expect(parsedAst.children[0].children[2].type).toBe("ListItem");
    expect(parsedAst.children[0].children[4].type).toBe("ListItem");
    expect(parsedAst.children[0].children[4].children[0].type).toBe("ListItem");
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
    expect(actual.children.length).toBe(3);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[2].type).toBe(ASTNodeTypes.Paragraph);
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
    expect(actual.children.length).toBe(5);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[2].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[4].type).toBe(ASTNodeTypes.Comment);
  });
  test("Two lines of comments between other environments", () => {
    const code = `
        \\documentclass{article}
        \\title{a}
        % first comment
        % second comment
        \\author{b}
        `;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[0].children[2].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[0].children[4].type).toBe(ASTNodeTypes.Comment);
  });
  test("issue52", () => {
    const code = `A%B
C`;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[0].children[0].type).toBe(ASTNodeTypes.Str);
    expect(actual.children[0].children[1].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[0].children[2].type).toBe(ASTNodeTypes.Str);
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
        plugin: require("@textlint/textlint-plugin-markdown").default
      }
    ],
    rules: [
      {
        ruleId: "spelling",
        rule: require("textlint-rule-spelling"),
        options: {
          language: "en",
          suggestCorrections: true
        }
      }
    ]
  };
  test("latex code", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}
        What colour do you like?

        \\hoge
        What color do you like?
        \\end{document}
        `;
    const output = `
        \\documentclass{article}
        \\begin{document}
        What color do you like?

        \\hoge
        What color do you like?
        \\end{document}
        `;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });

  test("latex code one line", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}What colour do you like?\\end{document}
        `;
    const output = `
        \\documentclass{article}
        \\begin{document}What color do you like?\\end{document}
        `;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
  test("latex code outside of document environment", async () => {
    const input = `What colour do you like?`;
    const output = `What color do you like?`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
  test("latex code with comments", async () => {
    const input = `
        \\documentclass{article}
        \\begin{document}
          % comment
          What colour do you like?
        \\end{document}`;
    const output = `
        \\documentclass{article}
        \\begin{document}
          % comment
          What color do you like?
        \\end{document}`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
  test("latex code with comments (outside of document)", async () => {
    // FIX: A new line before \documentclass causes an error.
    const input = `\\documentclass{article}
        % comment
        \\begin{document}
          What colour do you like?
        \\end{document}
        % comment`;
    const output = `\\documentclass{article}
        % comment
        \\begin{document}
          What color do you like?
        \\end{document}
        % comment`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
});
