/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

interface Position {
  line: number;
  column: number;
}

export default (text: string, nchar: number): Position => {
  let nl = 0,
    nc = 0;
  for (let i = 0; i < nchar; i++) {
    nl = text[i] === "\n" ? nl + 1 : nl + 0;
    nc = text[i] === "\n" ? 0 : nc + 1;
  }
  return { line: nl + 1, column: nc };
};
