import * as ASTTester from "@textlint/ast-tester";
import "jest";
import { LaTeX, parse } from "../src/latex-to-ast";

describe("Parsimmon AST", async () => {
  test("non-null", async () => {
    const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
      //process.stdout.write(JSON.stringify(LaTeX.Program.tryParse(code), null, 2));
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
});

describe("Txtnode AST", async () => {
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
