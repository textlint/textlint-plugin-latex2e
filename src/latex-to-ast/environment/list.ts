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
import { CommandNode } from "../command";
import { BeginEnvironment, EndEnvironment, EnvironmentNode } from "./common";

export const List = (r: Rules) => {
  const context = { name: "", parents: [] };
  const item = Parsimmon.seqObj<CommandNode>(
    ["name", Parsimmon.regex(/\\(i+tem)/, 1)],
    ["arguments", r.Program.map(_ => [_])]
  ).node("command");
  const body = Parsimmon.seqMap(
    Parsimmon.index,
    item.many(),
    Parsimmon.index,
    (start, items, end) => ({
      start,
      end,
      name: "program",
      value: items
    })
  );
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", BeginEnvironment("itemize|enumerate", context, "([\\r\\n\\ ]*(\\\\(?!.*item\\ ).*))?")],
    ["arguments", Parsimmon.alt(r.Option, r.Argument).many()],
    Parsimmon.whitespace,
    ["body", body],
    EndEnvironment(context)
  ).node("environment");
};
