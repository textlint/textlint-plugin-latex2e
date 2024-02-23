/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import { describe, expect, test } from "vitest";
import * as ASTTester from "@textlint/ast-tester";
import { parse } from "../src/parse";
import { TextlintKernel } from "@textlint/kernel";
import {
  ASTNodeTypes,
  TxtLinkNode,
  TxtParagraphNode,
  TxtTextNode,
} from "@textlint/ast-node-types";

import TextlintRuleSpelling from "textlint-rule-spelling";
import LaTeXProcessor from "../src";
import MarkdownProcessor from "@textlint/textlint-plugin-markdown";

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
    expect(parsedAst.children[0].type).toBe(ASTNodeTypes.List);
    const listNode = parsedAst.children[0];
    if (listNode.type === ASTNodeTypes.List) {
      expect(listNode.children.length).toBe(2);
      expect(listNode.children[0].type).toBe(ASTNodeTypes.ListItem);
      expect(listNode.children[1].type).toBe(ASTNodeTypes.ListItem);
      const nestedListNode = listNode.children[1].children[0];
      if (nestedListNode.type === ASTNodeTypes.List) {
        expect(nestedListNode.children[0].type).toBe(ASTNodeTypes.ListItem);
      }
    }
  });
  test("Paragraph should not be nested", () => {
    const code = `\\documentclass{article}
      \\begin{document}
      \\begin{theorem}
      A Cat is cute.
      \\end{theorem}
      \\end{document}
      `;
    ASTTester.test(parse(code));
  });
  test("Parse comments", () => {
    const code = `\\begin{document}
% comment
abcd
\\end{document}
        `;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    if (actual.children[0].type === ASTNodeTypes.Paragraph) {
      expect(actual.children[0].children.length).toBe(2);
      expect(actual.children[0].children[0].type).toBe(ASTNodeTypes.Comment);
      expect(actual.children[0].children[1].type).toBe(ASTNodeTypes.Str);
    }
  });
  test("Parse comments (outside of document)", () => {
    const code = `\\documentclass{article}
% comment
\\begin{document}
abcd
\\end{document}
% comment`;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(4);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Html);
    expect(actual.children[1].type).toBe(ASTNodeTypes.Comment);
    expect(actual.children[2].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[3].type).toBe(ASTNodeTypes.Comment);
  });
  test("Two lines of comments between other environments", () => {
    // 空文字列の後のコメントはポジションを持たない
    // english: .
    const code = `
\\documentclass{article}
\\title{a}
% first comment
% second comment
\\author{b}`;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(3);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[1].type).toBe(ASTNodeTypes.Header);
    expect(actual.children[2].type).toBe(ASTNodeTypes.Paragraph);
    const paragraphNode = actual.children[2] as TxtParagraphNode;
    expect(paragraphNode.children[0].type).toBe(ASTNodeTypes.Comment);
    expect(paragraphNode.children[1].type).toBe(ASTNodeTypes.Comment);
  });
  test("issue52", () => {
    const code = `A%B
C`;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    const paragraphNode = actual.children[0] as TxtParagraphNode;
    expect(paragraphNode.children[0].type).toBe(ASTNodeTypes.Str);
    expect(paragraphNode.children[1].type).toBe(ASTNodeTypes.Comment);
    expect(paragraphNode.children[2].type).toBe(ASTNodeTypes.Str);
  });
  test("comments in a equation environment are ignored", () => {
    const code = `\\begin{equation}
    % comment
    x = x^{2} % comment
\\end{equation}`;
    const actual = parse(code);
    ASTTester.test(actual);
    expect(actual.children.length).toBe(1);
    // If it is known that it is of type CodeBlock, it is known that it does not have children.
    expect(actual.children[0].type).toBe(ASTNodeTypes.CodeBlock);
  });
  test("url command", () => {
    const code = `\\url{http://example.com/}`;
    const actual = parse(code);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    const paragraphNode = actual.children[0] as TxtParagraphNode;
    expect(paragraphNode.children[0].type).toBe(ASTNodeTypes.Link);
    const linkNode = paragraphNode.children[0] as TxtLinkNode;
    expect(linkNode.url).toBe("http://example.com/");
    expect(linkNode.children[0].type).toBe(ASTNodeTypes.Str);
    const linkTextNode = linkNode.children[0] as TxtTextNode;
    expect(linkTextNode.value).toBe("http://example.com/");
  });
  test("href command", () => {
    const code = `\\href{http://example.com/}{link}`;
    const actual = parse(code);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    const paragraphNode = actual.children[0] as TxtParagraphNode;
    expect(paragraphNode.children[0].type).toBe(ASTNodeTypes.Link);
    const linkNode = paragraphNode.children[0] as TxtLinkNode;
    expect(linkNode.url).toBe("http://example.com/");
    expect(linkNode.children[0].type).toBe(ASTNodeTypes.Str);
    const linkTextNode = linkNode.children[0] as TxtTextNode;
    expect(linkTextNode.value).toBe("link");
  });
  test("label command", () => {
    const code = `\\ref{label}`;
    const actual = parse(code);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
    const paragraphNode = actual.children[0] as TxtParagraphNode;
    expect(paragraphNode.children.length).toBe(1);
    expect(paragraphNode.children[0].type).toBe(ASTNodeTypes.Html);
    expect(paragraphNode.children[0].raw).toBe(code);
  });
  test("CodeBlock is not to be included in paragraph", () => {
    const code = `\\section{title}
hogehoge
\\begin{equation}
  x = y
\\end{equation}
fugafuga`;
    const actual = parse(code);
    expect(actual.children.length).toBe(4);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Header);
    expect(actual.children[1].type).toBe(ASTNodeTypes.Paragraph);
    expect(actual.children[2].type).toBe(ASTNodeTypes.CodeBlock);
    expect(actual.children[3].type).toBe(ASTNodeTypes.Paragraph);
  });
  test("ref should be included in paragraph", () => {
    const code = `This sentence \\ref{refs} must be parsed as one paragraph.`;
    const actual = parse(code);
    expect(actual.children.length).toBe(1);
    expect(actual.children[0].type).toBe(ASTNodeTypes.Paragraph);
  });
  test("comments with blank lines should be allowed in itemize environment", () => {
    const code = `\\begin{itemize}
  \\item item1

  % comment
  \\item item2
\\end{itemize}`;
    const actual = parse(code);
    expect(actual.children.length).toBe(1);

    const listNode = actual.children[0];
    expect(listNode.type).toBe(ASTNodeTypes.List);

    if (listNode.type === ASTNodeTypes.List) {
      expect(listNode.children[0].type).toBe(ASTNodeTypes.ListItem);
      expect(listNode.children[2].type).toBe(ASTNodeTypes.ListItem);
    }
  });
});

describe("Fixing document", () => {
  const kernel = new TextlintKernel();
  const options = {
    filePath: "<test>",
    plugins: [
      { pluginId: "latex2e", plugin: LaTeXProcessor },
      {
        pluginId: "markdown",
        plugin: MarkdownProcessor,
      },
    ],
    rules: [
      {
        ruleId: "spelling",
        rule: TextlintRuleSpelling,
        options: {
          language: "en",
          suggestCorrections: true,
        },
      },
    ],
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
  test("comments in a equation environment", async () => {
    const input = `\\begin{equation}
% Comment
x^x % comment
\\end{equation}`;
    const output = `\\begin{equation}
% Comment
x^x % comment
\\end{equation}`;
    const result = await kernel.fixText(input, { ...options, ext: ".tex" });
    expect(result.output).toBe(output);
  });
});
