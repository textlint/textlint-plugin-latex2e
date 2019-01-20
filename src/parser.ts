import P from "parsimmon";

const LaTeX = P.createLanguage({
    Environment(r) {
        let name = "";
        const BeginEnvironment = P((input, i) => {
            const m = input.slice(i).match(/^\\begin\{(.*?)\}/);
            if (m !== null) {
                name = m[1];
                return P.makeSuccess(i + m[0].length, m[1]);
            } else {
                return P.makeFailure(i, "Not a environment");
            }
        });
        const EndEnvironment = P((input, i) => {
            const m = input.slice(i).match(new RegExp(`^\\\\end\\{${name}\\}`));
            if (m !== null) {
                return P.makeSuccess(i + m[0].length, null);
            } else {
                return P.makeFailure(i, "Not a environment");
            }
        });
        const option = r.Program.wrap(P.string("["), P.string("]"));
        const argument = r.Program.wrap(P.string("{"), P.string("}"));
        return P.seqObj<any>(
            ["name", BeginEnvironment],
            ["arguments", P.alt(option, argument).many()],
            ["body", r.Program],
            EndEnvironment,
        ).node("environment");
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

process.stdout.write(JSON.stringify(LaTeX.Program.tryParse(`
\\documentclass{article}
\\begin{document}
Hello
\\end{document}
`), null, 2));
