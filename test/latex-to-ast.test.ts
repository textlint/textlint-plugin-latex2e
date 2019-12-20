import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { parse } from "../src/latex-to-ast";
import { LaTeX } from "../src/latex-to-ast/latex";
import { TextlintKernel } from "@textlint/kernel";

describe("Parsimmon AST", () => {
  test("non-null", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
    expect(LaTeX.Program.tryParse(code)).toBeTruthy();
  });
  test("inline-math", async () => {
    const cases = ["\\(a+b\\)", "$a+b$"];
    for (const code of cases) {
      expect(LaTeX.Program.tryParse(code).value[0].name).toBe("environment");
      expect(LaTeX.Program.tryParse(code).value.length).toBe(1);
    }
  });
  test("displaymath", async () => {
    const cases = ["\\[a+b\\]", "$$a+b$$"];
    for (const code of cases) {
      expect(LaTeX.Program.tryParse(code).value[0].name).toBe("environment");
      expect(LaTeX.Program.tryParse(code).value.length).toBe(1);
    }
  });
  test("verb", async () => {
    const codes = [
      `\\verb|abc|`,
      `\\verb%|$|%`,
      `\\verb$%^&$`,
    ];
    for(const code of codes) {
      const ast = LaTeX.Program.tryParse(code);
      expect(ast.value[0].value.name).toBe("verb");
      expect(ast.value[0].value.arguments[0].length).toBe(3);
    }
  });
  test("non-null opt", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        \\begin{definition}[\\cite{textlint2019}, p.3, 10.2 LaTeX]
        LaTeX is awesome!
        \\end{definition}
        \\end{document}
        `;
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
    const codes = [
      `\\begin{itemize}
         \\item 1 \\command
         \\item \\command 2
       \\end{itemize}`,
      `\\begin{itemize}
         \\itemsep1pt\\parskip0pt\\parsep0pt
         \\item 1
         \\item 2
       \\end{itemize}`
    ];
    for(const code of codes) {
      const ast = LaTeX.Program.tryParse(code);
      expect(ast.value[0].value.name).toBe("itemize");
      expect(ast.value[0].value.body.value.length).toBe(2);
    }
  });
  test("Counting items in description", async () => {
    const code = `\\begin{description}
          \\item[用語A]~\\\\
              hogefuga \\\\
              piyopoyo
          \\item[用語B]~\\\\
              hogefuga \\\\
              piyopoyo
          \\item[用語C]~\\\\
              hogefuga \\\\
              piyopoyo
       \\end{description}`;
    const ast = LaTeX.Program.tryParse(code);
    expect(ast.value[0].value.name).toBe("description");
    expect(ast.value[0].value.body.value.length).toBe(3);
  });
  test("figure environment", async () => {
    const code = `\\begin{figure}
        \\includegraphics[width=5cm]{somefigure.png}
        \\caption{This is a caption}
        \\end{figure}
        \\begin{figure*}
        \\includegraphics[width=5cm]{anotherfigure.png}
        \\caption{This is an another caption}
        \\end{figure*}`;
    const ast = LaTeX.Program.tryParse(code);
    expect(ast.value[0].value.name).toBe("figure");
    expect(ast.value[2].value.name).toBe("figure*");
  });
  test("nested environments", async () => {
    const code = `\\begin{figure}
        \\begin{minipage}{0.45\hsize}
        \\begin{center}
        \\includegraphics[width=5cm]{somefigure.png}
        \\end{center}
        \\end{minipage}
        \\end{figure}`;
    const ast = LaTeX.Program.tryParse(code);
    const top = ast.value[0].value;
    expect(top.name).toBe("figure");
    expect(top.body.value[1].value.name).toBe("minipage");
    expect(top.body.value[1].value.body.value[1].value.name).toBe("center");
  });
  test("math", async () => {
    const code = `$1 + 1 = 2$
        \\(1 + 1 = 2\\)
        $$1 + 1 = 2$$
        \\[1 + 1 = 2\\]`;
    const ast = LaTeX.Program.tryParse(code);
    for (let i = 0; i <= 6; i += 2) {
      const v = ast.value[i].value;
      expect(v.name).toBe(i <= 2 ? "inlinemath" : "displaymath");
      expect(v.body.value[0].value).toBe("1 + 1 = 2");
    }
  });
  test("commands for symbols, spaces, etc.", async () => {
    const symbols = ["#", "@", "$", "%", "&", "_", "{", "}", ",", "/", " ", "\\"];
    const code = symbols.reduce((p, v) => p += "\\" + v, "")
    const ast = LaTeX.Program.tryParse(code);
    for(let i = 0; i < ast.value.length; ++i) {
      expect(ast.value[i].name).toBe("command");
      expect(ast.value[i].value.name).toBe(symbols[i]);
    }
  });
});

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
    const code = `
        \\begin{document}
        %
        hoge%
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
