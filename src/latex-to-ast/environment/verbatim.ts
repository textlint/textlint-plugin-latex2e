/*
 * This file is part of textlint-plugin-latex2e
 *
 * textlint-plugin-latex2e is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * textlint-plugin-latex2e is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with textlint-plugin-latex2e.  If not, see <http://www.gnu.org/licenses/>.
 */

import Parsimmon from "parsimmon";
import { Rules } from "../rules";
import { BeginEnvironment, EndEnvironment, EnvironmentNode } from "./common";

export const VerbatimEnv = (r: Rules) => {
  const context = { name: "", parents: [] };
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", BeginEnvironment("verbatim\\*?", context)],
    ["arguments", Parsimmon.alt(r.Option, r.Argument).many()],
    [
      "body",
      Parsimmon.regexp(/(?:(?!\\end\{verbatim\*?})[\s\S])*/).node("text")
    ],
    EndEnvironment(context)
  ).node("environment");
};
