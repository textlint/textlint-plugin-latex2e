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
import { Rules } from "../rules";
import Parsimmon from "parsimmon";

export interface CommandNode {
  name: string;
  arguments: any[];
}

export const Command = (r: Rules) => {
  const option = r.Option;
  const argument = r.Argument;
  const name = Parsimmon.regexp(
    /\\(?!begin|end|verbatim|item)([a-zA-Z_@]+|[`'^"~=_#$%&{}\.\\ ])/,
    1
  );
  return Parsimmon.seqObj<CommandNode>(
    ["name", name],
    ["arguments", Parsimmon.alt(option, argument).many()]
  ).node("command");
};
