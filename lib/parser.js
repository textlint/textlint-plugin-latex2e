"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const parsimmon_1 = __importDefault(require("parsimmon"));
const ast_node_types_1 = require("@textlint/ast-node-types");
const traverse_1 = __importDefault(require("traverse"));
const BeginEnvironment = (pattern, context) => parsimmon_1.default((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\begin\\{(${pattern})\\}`));
    if (m !== null) {
        context.name = m[1];
        return parsimmon_1.default.makeSuccess(i + m[0].length, m[1]);
    }
    else {
        return parsimmon_1.default.makeFailure(i, `\\begin{${pattern}}`);
    }
});
const EndEnvironment = (context) => parsimmon_1.default((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\end\\{${context.name}\\}`));
    if (m !== null) {
        return parsimmon_1.default.makeSuccess(i + m[0].length, null);
    }
    else {
        return parsimmon_1.default.makeFailure(i, `\\end{${context.name}}`);
    }
});
exports.LaTeX = parsimmon_1.default.createLanguage({
    Environment(r) {
        const context = { name: "" };
        const option = r.Program.wrap(parsimmon_1.default.string("["), parsimmon_1.default.string("]"));
        const argument = r.Program.wrap(parsimmon_1.default.string("{"), parsimmon_1.default.string("}"));
        return parsimmon_1.default.seqObj(["name", BeginEnvironment(".*?", context)], ["arguments", parsimmon_1.default.alt(option, argument).many()], ["body", r.Program], EndEnvironment(context)).node("environment");
    },
    ListEnvironment(r) {
        const context = { name: "" };
        const option = r.Program.wrap(parsimmon_1.default.string("["), parsimmon_1.default.string("]"));
        const argument = r.Program.wrap(parsimmon_1.default.string("{"), parsimmon_1.default.string("}"));
        const item = parsimmon_1.default.seqObj(["name", parsimmon_1.default.regex(/\\(i+tem)/, 1)], ["arguments", r.Program.map(_ => [_])]).node("macro");
        const body = parsimmon_1.default.seqMap(parsimmon_1.default.index, item.many(), parsimmon_1.default.index, (start, items, end) => ({
            end,
            name: "program",
            start,
            value: items
        }));
        return parsimmon_1.default.seqObj(["name", BeginEnvironment("itemize|enumerate", context)], ["arguments", parsimmon_1.default.alt(option, argument).many()], ["body", body], EndEnvironment(context)).node("environment");
    },
    DisplayMathEnvironment(r) {
        const latexStyle = r.Program.wrap(parsimmon_1.default.string("\\["), parsimmon_1.default.string("\\]"));
        const texStyle = r.Program.wrap(parsimmon_1.default.string("$$"), parsimmon_1.default.string("$$"));
        return parsimmon_1.default.seqObj(["name", parsimmon_1.default.succeed("displaymath")], ["arguments", parsimmon_1.default.succeed([])], ["body", parsimmon_1.default.alt(latexStyle, texStyle)]).node("environment");
    },
    InlineMathEnvironment(r) {
        const latexStyle = r.Program.wrap(parsimmon_1.default.string("\\("), parsimmon_1.default.string("\\)"));
        const texStyle = r.Program.wrap(parsimmon_1.default.string("$"), parsimmon_1.default.string("$"));
        return parsimmon_1.default.seqObj(["name", parsimmon_1.default.succeed("displaymath")], ["arguments", parsimmon_1.default.succeed([])], ["body", parsimmon_1.default.alt(latexStyle, texStyle)]).node("environment");
    },
    Macro(r) {
        const option = r.Program.wrap(parsimmon_1.default.string("["), parsimmon_1.default.string("]"));
        const argument = r.Program.wrap(parsimmon_1.default.string("{"), parsimmon_1.default.string("}"));
        return parsimmon_1.default.seqObj([
            "name",
            parsimmon_1.default.regexp(/\\(?!begin|end|verbatim|item)([a-zA-Z_@]+|`'^"~=\.)/, 1)
        ], ["arguments", parsimmon_1.default.alt(option, argument).many()]).node("macro");
    },
    VerbatimMacro() {
        return parsimmon_1.default.seqObj(["name", parsimmon_1.default.regexp(/\\(verb*?)/, 1)], ["arguments", parsimmon_1.default.regexp(/\|.*?\|/, 1).map(_ => [_])]).node("macro");
    },
    Comment() {
        return parsimmon_1.default.regexp(/%([^\n\r]+)/, 1).node("comment");
    },
    EmptyLine() {
        return parsimmon_1.default.newline
            .atLeast(2)
            .map(_ => _.join(""))
            .node("emptyline");
    },
    Program(r) {
        const e = parsimmon_1.default.alt(r.DisplayMathEnvironment, r.InlineMathEnvironment, r.ListEnvironment, r.Environment);
        const m = parsimmon_1.default.alt(r.VerbatimMacro, r.Macro);
        return parsimmon_1.default.alt(e, m, r.EmptyLine, r.Text, r.Comment)
            .many()
            .node("program");
    },
    Text() {
        return parsimmon_1.default.alt(parsimmon_1.default.noneOf("$%{}\\\n\r"), parsimmon_1.default.newline.notFollowedBy(parsimmon_1.default.newline))
            .atLeast(1)
            .map(_ => _.join(""))
            .node("text");
    }
});
exports.TxtAST = {
    parse(text) {
        const ast = exports.LaTeX.Program.tryParse(text);
        return traverse_1.default(ast).map(function (node) {
            if (this.parent && this.parent.node.isDocument && JSON.stringify(this.parent.node.children) === JSON.stringify(node)) {
                const children = [
                    Object.assign({}, this.parent.node, { type: ast_node_types_1.ASTNodeTypes.Paragraph, children: [node[0]], isDocument: false })
                ];
                for (const child of node.slice(1)) {
                    if (child.name === "emptyline") {
                        children.push(child);
                        children.slice(-1)[0].loc.end = {
                            line: child.start.line,
                            column: child.start.column - 1
                        };
                        children.slice(-1)[0].range[1] = child.start.offset;
                        children.slice(-1)[0].raw = text.slice(children.slice(-1)[0].range[0], children.slice(-1)[0].range[1]);
                        children.push({
                            type: ast_node_types_1.ASTNodeTypes.Paragraph,
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
                    }
                    else {
                        children.slice(-1)[0].children.push(child);
                    }
                }
                children.slice(-1)[0].loc.end = this.parent.node.loc.end;
                children.slice(-1)[0].range.push(this.parent.node.range[1]);
                children.slice(-1)[0].raw = text.slice(children.slice(-1)[0].range[0], children.slice(-1)[0].range[1]);
                this.update(children);
            }
            if (this.notLeaf && node.value) {
                const tmp = {
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
                        this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Comment, value: node.value }));
                        break;
                    case "emptyline":
                        this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Break }));
                        break;
                    case "text":
                        this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Str, value: node.value }));
                        break;
                    case "macro":
                        switch (node.value.name) {
                            case "textbf":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Strong, children: node.value.arguments }));
                                break;
                            case "textit":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Emphasis, children: node.value.arguments }));
                                break;
                            case "item":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.ListItem, children: node.value.arguments }));
                                break;
                            case "verb":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Code, value: node.value.arguments[0] }));
                                break;
                            case "verb*":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Code, value: node.value.arguments[0] }));
                                break;
                            case "section":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Header, children: node.value.arguments }));
                                break;
                            case "subsection":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Header, children: node.value.arguments }));
                                break;
                            case "subsubsection":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Header, children: node.value.arguments }));
                                break;
                            case "chapter":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Header, children: node.value.arguments }));
                                break;
                            default:
                                this.update(Object.assign({}, tmp, { type: "Unknown", children: node.value.arguments }));
                                break;
                        }
                        break;
                    case "environment":
                        switch (node.value.name) {
                            case "displaymath":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.CodeBlock, children: node.value.arguments.concat(node.value.body) }));
                                break;
                            case "inlinemath":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Code, children: node.value.arguments.concat(node.value.body) }));
                                break;
                            case "enumerate":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.List, children: node.value.arguments.concat(node.value.body) }));
                                break;
                            case "itemize":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.List, children: node.value.arguments.concat(node.value.body) }));
                                break;
                            case "document":
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Html, children: node.value.arguments.concat(node.value.body), isDocument: true }));
                                break;
                            default:
                                this.update(Object.assign({}, tmp, { type: ast_node_types_1.ASTNodeTypes.Html, children: node.value.arguments.concat(node.value.body) }));
                        }
                        break;
                    case "program":
                        this.update(Object.assign({}, tmp, { type: this.isRoot ? ast_node_types_1.ASTNodeTypes.Document : ast_node_types_1.ASTNodeTypes.Html, children: node.value }));
                        break;
                }
            }
        });
    }
};
