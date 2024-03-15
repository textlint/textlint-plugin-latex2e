import path from "path";
import fs from "fs";

import { test } from "@textlint/ast-tester";
import { describe, it, assert } from "vitest";

import { parse } from "../src/parse";

describe.concurrent("parse", () => {
  const fixtureDir = path.join(__dirname, "fixtures");
  fs.readdirSync(fixtureDir).forEach((dir) => {
    it(`should parse ${dir}`, async () => {
      const input = fs.readFileSync(
        path.join(fixtureDir, dir, "input.tex"),
        "utf-8",
      );
      const actual = parse(input);
      test(actual);
      const expected = JSON.parse(
        fs.readFileSync(path.join(fixtureDir, dir, "output.json"), "utf-8"),
      );
      assert.deepStrictEqual(actual, expected);
    });
  });
});
