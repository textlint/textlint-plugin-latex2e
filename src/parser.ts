import { fromNullable } from "fp-ts/lib/Option";
import P from "parsimmon";

const createCreateLanguage = (content: string) => P.createLanguage({
    Environment(r) {
        const environments = fromNullable(content.match(/\\begin\{.*?\}/g))
            .getOrElse([]).map((e) => e.replace(/\\begin\{|\}/g, ""));
        const option = r.Program.wrap(P.string("["), P.string("]"));
        const argument = r.Program.wrap(P.string("{"), P.string("}"));
        return P.alt.apply(null, environments.map((environment) => P.seqObj<any>(
            ["name", P.succeed(environment)],
            P.string(`\\begin{${environment}}`),
            ["arguments", P.alt(option, argument).many()],
            ["body", r.Program],
            P.string(`\\end{${environment}}`),
        ))).node("environment");
    },
    Verbatim() {
        return P.alt(P.regexp(/\\verb\|(.*?)\|/, 1), P.regexp(/\\verb*\|(.*?)\|/, 1)).node("verbatim");
    },
    Macro(r) {
        const option = r.Program.wrap(P.string("["), P.string("]"));
        const argument = r.Program.wrap(P.string("{"), P.string("}"));
        const name = P.regexp(/[a-zA-Z_@]+/);
        return P.seqObj<any>(
            P.string("\\").notFollowedBy(P.alt(P.string("begin"), P.string("end"), P.string("verb"))),
            ["name", name],
            ["arguments", P.alt(option, argument).many()],
        ).node("macro");
    },
    Comment() {
        return P.regexp(/%([^\n\r]+)/, 1).node("comment");
    },
    EmptyLine() {
        return P.newline.atLeast(2).map((_) => _.join("")).node("emptyline");
    },
    DisplayMath(r) {
        const latexStyle = r.Program.wrap(P.string("\\["), P.string("\\]"));
        const latexEnvironmentStyle = r.Program.wrap(P.string("\\begin{displaymath}"), P.string("\\end{displaymath}"));
        const texStyle = r.Program.wrap(P.string("$$"), P.string("$$"));
        return P.alt(latexStyle, latexEnvironmentStyle, texStyle).node("displaymath");
    },
    InlineMath(r) {
        const latexStyle = r.Program.wrap(P.string("\\("), P.string("\\)"));
        const texStyle = r.Program.wrap(P.string("$"), P.string("$"));
        return P.alt(latexStyle, texStyle).node("inlinemath");
    },
    Program(r) {
        return P.alt(r.EmptyLine, r.Text, r.DisplayMath, r.InlineMath,
            r.Environment, r.Macro, r.Comment).many().node("program");
    },
    Text() {
        return P.alt(P.noneOf("$%{}\\\n\r"), P.newline.notFollowedBy(P.newline))
            .atLeast(1).map((_) => _.join("")).node("text");
    },
});

export const parse = (content: string): P.Node<"program", any> => {
    return createCreateLanguage(content).Program.tryParse(content);
};
