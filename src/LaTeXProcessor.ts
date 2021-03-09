/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */

import {
  TextlintPluginProcessor,
  TextlintPluginOptions,
} from "@textlint/types";
import { parse } from "./latex-to-ast";

export class LaTeXProcessor implements TextlintPluginProcessor {
  private config: TextlintPluginOptions;

  public constructor(config = {}) {
    this.config = config;
  }

  public availableExtensions(): string[] {
    return [".tex", ".cls"].concat(this.config.extensions || []);
  }

  public processor(): ReturnType<TextlintPluginProcessor["processor"]> {
    return {
      preProcess(text: string) {
        return parse(text);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      postProcess(messages: any[], filePath?: string) {
        return {
          messages,
          filePath: filePath ? filePath : "<latex>",
        };
      },
    };
  }
}
