import tseslint from "typescript-eslint";

export default tseslint.config(
    {
        ignores: ["node_modules/**", "cjs/**", "lib/**"],
    },
    ...tseslint.configs.recommended,
    {
        files: ["src/**/*.ts", "test/**/*.ts"],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                project: "./tsconfig.eslint.json",
            },
        },
        plugins: {
            '@typescript-eslint': tseslint.plugin,
        }
    },
);