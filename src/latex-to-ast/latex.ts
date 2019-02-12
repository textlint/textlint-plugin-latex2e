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
  Figure,
  InlineMath,
  Document,
  List
} from "./environment";
import { Command, Verbatim } from "./command";
import { Text } from "./text";
import { Comment } from "./comment";
import { EmptyLine } from "./emptyline";
import { Argument } from "./argument";
import { Option } from "./option";

export const LaTeX = Parsimmon.createLanguage({
  Environment,
  Document,
  List,
  DisplayMath,
  Figure,
  InlineMath,
  Command,
  Verbatim,
  Argument,
  Option,
  Comment,
  EmptyLine,
  Text,
  Program(r) {
    const environment = Parsimmon.alt(
      r.DisplayMath,
      r.InlineMath,
      r.List,
      r.Document,
      r.Environment
    );
    const command = Parsimmon.alt(r.Verbatim, r.Command);
    return Parsimmon.alt(
      environment,
      command,
      r.EmptyLine,
      r.Text,
      r.Comment,
      r.Argument
    )
      .many()
      .node("program");
  }
});
