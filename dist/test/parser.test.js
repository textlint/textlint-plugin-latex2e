"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const ASTTester = __importStar(require("@textlint/ast-tester"));
require("jest");
const parser_1 = require("../src/parser");
describe("Parsimmon AST", () => __awaiter(this, void 0, void 0, function* () {
    test("non-null", () => __awaiter(this, void 0, void 0, function* () {
        const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
        // process.stdout.write(JSON.stringify(LaTeX.Program.tryParse(code), null, 2));
        expect(parser_1.LaTeX.Program.tryParse(code)).toBeTruthy();
    }));
    test("comment", () => __awaiter(this, void 0, void 0, function* () {
        const code = `%comment`;
        expect(parser_1.LaTeX.Program.tryParse(code)).toEqual({
            end: {
                column: 9,
                line: 1,
                offset: 8,
            },
            name: "program",
            start: {
                column: 1,
                line: 1,
                offset: 0,
            },
            value: [{
                    end: {
                        column: 9,
                        line: 1,
                        offset: 8,
                    },
                    name: "comment",
                    start: {
                        column: 1,
                        line: 1,
                        offset: 0,
                    },
                    value: "comment",
                }],
        });
    }));
}));
describe("Txtnode AST", () => __awaiter(this, void 0, void 0, function* () {
    test("valid ast", () => __awaiter(this, void 0, void 0, function* () {
        const code = `
        \\documentclass{article}
        \\begin{document}
        Hello
        \\end{document}
        `;
        //process.stdout.write(JSON.stringify(TxtAST.parse(code), null, 2));
        ASTTester.test(parser_1.TxtAST.parse(code));
    }));
}));
