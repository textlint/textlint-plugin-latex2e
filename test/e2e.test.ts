import child_process from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { suite, expect, test } from "vitest";

// These tests requires "E2E=true" environment variable to run and `npm` command should be callable globally.
suite.concurrent("e2e", () => {
  ["commonjs", "module"].forEach((moduleType) => {
    runE2ETestFor(moduleType, async ({ workDir }) => {
      const execCommand = (
        command: string,
        args: string[],
      ): child_process.SpawnSyncReturns<Buffer> => {
        return child_process.spawnSync(command, args, {
          cwd: workDir,
          stdio: "ignore",
        });
      };
      const npmInstall = execCommand("npm", ["install"]);
      expect(npmInstall.status).toBe(0);
      const textlintNoErr = execCommand("npx", ["textlint", "no-error.tex"]);
      expect(textlintNoErr.status).toBe(0);
      const textlintErr = execCommand("npx", ["textlint", "error.tex"]);
      expect(textlintErr.status).toBe(1);
      const textlintNoErrByComment = execCommand("npx", [
        "textlint",
        "no-error-by-comment.tex",
      ]);
      expect(textlintNoErrByComment.status).toBe(0);
    });
  });
});

interface E2EContext {
  workDir: string;
}

// runE2ETestFor is a test runner for end-to-end tests.
// This will prepare test environment and clean up after the test.
// This will also skip the test if "E2E" environment variable is not set to "true".
const runE2ETestFor = test.extend<E2EContext>({
  workDir: async ({ task, skip }, use) => {
    const e2e = process.env.E2E;
    if (!e2e && e2e !== "true") {
      skip();
    }
    // Task name should be a module type.
    const workDir = prepare(task.name);
    try {
      await use(workDir);
    } finally {
      if (fs.existsSync(workDir)) {
        fs.rmSync(workDir, { recursive: true });
      }
    }
  },
});

// prepare will create temporary directory and write files for testing.
// This returns the path of the temporary directory.
// moduleType should be "commonjs" or "module". It will be used for package.json.
// Deleting the temporary directory is the responsibility of the caller.
const prepare = (moduleType: string): string => {
  const templateDir = path.join(__dirname, "templates");

  const packageRoot = path.dirname(__dirname);
  const rootPackageJson = fs.readFileSync(
    path.join(packageRoot, "package.json"),
    "utf-8",
  );
  const textlintVersion =
    JSON.parse(rootPackageJson)["devDependencies"]["@textlint/kernel"];

  const readFromTmplDir = (filename: string) =>
    fs.readFileSync(path.join(templateDir, filename), "utf-8");

  const packageJsonTmpl = readFromTmplDir("package.json.tmpl");
  const packageJson = packageJsonTmpl
    .replace(/%PACKAGE_TYPE%/g, moduleType)
    .replace(/%TEXTLINT_VERSION%/g, textlintVersion)
    .replace(/%TEXTLINT_PLUGIN_LATEX2E_LOCATION%/g, `file://${packageRoot}`);
  const textlintrcTmpl = readFromTmplDir(".textlintrc.tmpl");
  const noErrorTexFile = readFromTmplDir("no-error.tex.tmpl");
  const noErrorByCommentTexFile = readFromTmplDir(
    "no-error-by-comment.tex.tmpl",
  );
  const errorTexFile = readFromTmplDir("error.tex.tmpl");

  const tmpDir = fs.mkdtempSync(os.tmpdir());
  const writeToTmpDir = (filename: string, content: string): void => {
    fs.writeFileSync(path.join(tmpDir, filename), content);
  };
  writeToTmpDir(".textlintrc", textlintrcTmpl);
  writeToTmpDir("no-error.tex", noErrorTexFile);
  writeToTmpDir("error.tex", errorTexFile);
  writeToTmpDir("no-error-by-comment.tex", noErrorByCommentTexFile);
  writeToTmpDir("package.json", packageJson);
  return tmpDir;
};
