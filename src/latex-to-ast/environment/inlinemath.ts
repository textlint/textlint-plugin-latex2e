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
import { Rules } from "../rules";
import { EnvironmentNode } from "./common";

export const InlineMath = (r: Rules) => {
  const latexStyle = r.Program.wrap(
    Parsimmon.string("\\("),
    Parsimmon.string("\\)")
  );
  const texStyle = r.Program.wrap(
    Parsimmon.regex(/\$(?!\$)/),
    Parsimmon.regex(/\$(?!\$)/)
  );
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", Parsimmon.succeed("inlinemath")],
    ["arguments", Parsimmon.succeed([])],
    ["body", Parsimmon.alt(latexStyle, texStyle)]
  ).node("environment");
};
