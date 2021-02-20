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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.
 * You should have received a copy of the GNU General Public License
 * along with textlint-plugin-latex2e.  If not, see <http://www.gnu.org/licenses/>.
 */

import * as fs from "fs";
import * as path from "path";

import { Command } from "commander";

import { parse } from "../latex-to-ast";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const hasProperty = (obj: any, key: string) => {
  return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeLocAndRange = (node: any) => {
  if (hasProperty(node, "loc")) {
    delete node.loc;
  }
  if (hasProperty(node, "range")) {
    delete node.range;
  }
  for (const key of Object.getOwnPropertyNames(node)) {
    const val = node[key];
    if (typeof val === "object") {
      removeLocAndRange(val);
    }
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const removeRaw = (node: any) => {
  if (hasProperty(node, "raw")) {
    delete node.raw;
  }
  for (const key of Object.getOwnPropertyNames(node)) {
    const val = node[key];
    if (typeof val === "object") {
      removeRaw(val);
    }
  }
};

const program = new Command();
program
  .option("-l, --location", "include location and range")
  .option("-r, --raw", "include raw")
  .usage("[OPTIONS] FILE")
  .parse(process.argv);

const filename = program.args[0];
if (!fs.existsSync(filename)) {
  if (!filename || filename === "") {
    program.help();
  }
  console.error(`${filename} does not exist`);
  process.exit(1);
}

if (path.extname(filename) !== ".tex") {
  console.error("Input file is not a TeX source.");
  process.exit(1);
}

const options = program.opts();
const enableLocation = options.location;
const enableRaw = options.raw;

const content = fs.readFileSync(filename);
const parsedAst = parse(content.toString());

if (!enableLocation) {
  removeLocAndRange(parsedAst);
}
if (!enableRaw) {
  removeRaw(parsedAst);
}

console.log(JSON.stringify(parsedAst, undefined, "  "));
