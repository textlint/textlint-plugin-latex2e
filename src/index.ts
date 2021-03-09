/*
 * Copyright (c) 2020 Textlint Plugin LaTex2e team. All rights reserved.
 *
 * This file is part of textlint-plugin-latex2e.
 * This software is released under the MIT License, see LICENSE.md .
 */
import { LaTeXProcessor } from "./LaTeXProcessor";
import { TextlintPluginCreator } from "@textlint/types";
export default { Processor: LaTeXProcessor } as TextlintPluginCreator;
