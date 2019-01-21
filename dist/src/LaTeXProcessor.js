"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parser_1 = require("./parser");
class LaTeXProcessor {
    constructor(config = {}) {
        this.config = config;
    }
    availableExtensions() {
        return [".tex", ".cls"].concat(this.config.extensions);
    }
    processor(extension) {
        return {
            preProcess(text, filePath) {
                return parser_1.TxtAST.parse(text);
            },
            postProcess(messages, filePath) {
                return {
                    messages,
                    filePath: filePath ? filePath : "<latex>"
                };
            }
        };
    }
}
exports.LaTeXProcessor = LaTeXProcessor;
