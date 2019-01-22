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
import { MacroNode } from "../macro";
import { BeginEnvironment, EndEnvironment, EnvironmentNode } from "./common";

export const List = (r: Rules) => {
  const context = { name: "" };
  const option = r.Option;
  const argument = r.Argument;
  const item = Parsimmon.seqObj<MacroNode>(
    ["name", Parsimmon.regex(/\\(i+tem)/, 1)],
    ["arguments", r.Program.map(_ => [_])]
  ).node("macro");
  const body = Parsimmon.seqMap(
    Parsimmon.index,
    item.many(),
    Parsimmon.index,
    (start, items, end) => ({
      end,
      name: "program",
      start,
      value: items
    })
  );
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", BeginEnvironment("itemize|enumerate", context)],
    ["arguments", Parsimmon.alt(option, argument).many()],
    ["body", body],
    EndEnvironment(context)
  ).node("environment");
};
