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

export interface EnvironmentNode {
  name: string;
  arguments: any[];
  body: any;
}

interface Context {
  name: string;
}

export const BeginEnvironment = (
  pattern: string,
  context: Context
): Parsimmon.Parser<string> =>
  Parsimmon((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\begin\\{(${pattern})\\}`));
    if (m !== null) {
      context.name = m[1];
      return Parsimmon.makeSuccess(i + m[0].length, m[1]);
    } else {
      return Parsimmon.makeFailure(i, `\\begin{${pattern}}`);
    }
  });

export const EndEnvironment = (context: Context): Parsimmon.Parser<null> =>
  Parsimmon((input, i) => {
    const m = input.slice(i).match(new RegExp(`^\\\\end\\{${context.name}\\}`));
    if (m !== null) {
      return Parsimmon.makeSuccess(i + m[0].length, null);
    } else {
      return Parsimmon.makeFailure(i, `\\end{${context.name}}`);
    }
  });

export const Environment = (r: Rules) => {
  const context = { name: "" };
  const option = r.Option;
  const argument = r.Argument;
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", BeginEnvironment(".*?", context)],
    ["arguments", Parsimmon.alt(option, argument).many()],
    ["body", r.Program],
    EndEnvironment(context)
  ).node("environment");
};
