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

import Parsimmon from "parsimmon";
import {
  Environment,
  DisplayMath,
  InlineMath,
  Document,
  List
} from "./environment";
import { Macro, Verbatim } from "./macro";

export const LaTeX = Parsimmon.createLanguage({
  Environment,
  Document,
  List,
  DisplayMath,
  InlineMath,
  Macro,
  Verbatim,
  Argument(r) {
    return r.Program.wrap(Parsimmon.string("{"), Parsimmon.string("}"));
  },
  Option(r) {
    return Parsimmon.noneOf("]")
      .many()
      .wrap(Parsimmon.string("["), Parsimmon.string("]"))
      .map((_: any) => {
        const opt = _.join();
        return r.Program.tryParse(opt);
      });
  },
  Comment() {
    return Parsimmon.regexp(/%([^\n\r]*)/, 1).node("comment");
  },
  EmptyLine() {
    return Parsimmon.newline
      .atLeast(2)
      .map(_ => _.join(""))
      .node("emptyline");
  },
  Program(r) {
    const environment = Parsimmon.alt(
      r.DisplayMath,
      r.InlineMath,
      r.List,
      r.Document,
      r.Environment
    );
    const macro = Parsimmon.alt(r.Verbatim, r.Macro);
    return Parsimmon.alt(
      environment,
      macro,
      r.EmptyLine,
      r.Text,
      r.Comment,
      r.Argument
    )
      .many()
      .node("program");
  },
  Text() {
    return Parsimmon.alt(
      Parsimmon.noneOf("$%{}\\\n\r"),
      Parsimmon.newline.notFollowedBy(Parsimmon.newline)
    )
      .atLeast(1)
      .map(_ => _.join(""))
      .node("text");
  }
});
