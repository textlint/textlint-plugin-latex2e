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
import { EnvironmentNode, BeginEnvironment, EndEnvironment } from "./common";
import { Rules } from "../rules";

export const Document = (r: Rules) => {
  const context = { name: "" };
  const option = r.Option;
  const argument = r.Argument;
  const body = r.Program.map(parentNode => {
    const value = [
      {
        start: parentNode.value[0].start,
        end: parentNode.value[0].end,
        name: "environment",
        value: {
          name: "paragraph",
          arguments: [],
          body: [] as any[]
        }
      }
    ];
    for (const item of parentNode.value) {
      value.slice(-1)[0].value.body.push(item);
      if (item.name === "emptyline" || item.value.name === "par") {
        value.slice(-1)[0].end = item.end;
        value.push({
          start: item.end,
          end: item.end,
          name: "environment",
          value: {
            name: "paragraph",
            arguments: [],
            body: []
          }
        });
      }
    }
    value.slice(-1)[0].end = parentNode.end;
    return {
      ...parentNode,
      value
    };
  });
  return Parsimmon.seqObj<EnvironmentNode>(
    ["name", BeginEnvironment("document", context)],
    ["arguments", Parsimmon.alt(option, argument).many()],
    ["body", body],
    EndEnvironment(context)
  ).node("environment");
};
