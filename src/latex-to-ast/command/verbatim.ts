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
import { Rules } from "../rules";
import Parsimmon from "parsimmon";

export interface CommandNode {
  name: string;
  arguments: any[];
}

export const Verbatim = (r: Rules) => {
  return Parsimmon.seqObj<CommandNode>(
    ["name", Parsimmon.regexp(/\\(verb)\*?/, 1)],
    ["arguments", Parsimmon.regexp(/([^a-z^A-Z\s\\\*])(.*?)\1/, 2).map(_ => [_])]
  ).node("command");
};
