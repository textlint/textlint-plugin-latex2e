import { TextlintPluginProcessor } from "@textlint/types"
import { TxtAST } from "./parser";

export class LaTeXProcessor implements TextlintPluginProcessor {
    private config: any;
    public constructor(config = {}) {
        this.config = config;
    }
    public availableExtensions(): string[] {
        return [".tex", ".cls"].concat(this.config.extensions);
    }
    public processor(extension: string) {
        return {
            preProcess(text: string, filePath: string) {
                return TxtAST.parse(text);
            },
            postProcess(messages: any[], filePath: string) {
                return {
                    messages,
                    filePath: filePath ? filePath : "<latex>"
                };
            }
        }
    }
}
