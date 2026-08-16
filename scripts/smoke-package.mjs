import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const npmCli = process.env.npm_execpath;
assert.ok(npmCli, "Run the package smoke test through an npm script.");
const temporaryRoot = await mkdtemp(resolve(tmpdir(), "expresso-package-smoke-"));
const packageDirectory = resolve(temporaryRoot, "package");
const projectDirectory = resolve(temporaryRoot, "project");
const installedPackage = resolve(
  projectDirectory,
  "node_modules",
  "@technodotventures",
  "expresso",
);
const expressoCli = resolve(installedPackage, "src", "cli.mjs");

try {
  await mkdir(packageDirectory);
  await mkdir(projectDirectory);
  const packed = await execFileAsync(
    process.execPath,
    [npmCli, "pack", "--json", "--pack-destination", packageDirectory],
    {
      cwd: root,
      env: {
        ...process.env,
        npm_config_cache: resolve(temporaryRoot, "npm-cache"),
      },
    },
  );
  const [metadata] = JSON.parse(packed.stdout);
  assert.equal(metadata.name, "@technodotventures/expresso");
  assert.equal(metadata.version, "0.3.2");
  assert.ok(metadata.files.some((file) => file.path === "src/cli.mjs"));
  assert.ok(metadata.files.some((file) => file.path === "providers/catalog.json"));
  assert.ok(metadata.files.some((file) => file.path === "README.md"));
  assert.ok(metadata.files.some((file) => file.path === "LICENSE"));
  assert.ok(metadata.files.some((file) => file.path === "SECURITY.md"));
  assert.ok(metadata.files.some((file) => file.path === "SUPPORT.md"));
  assert.ok(metadata.files.some((file) => file.path === "test/runtime.test.mjs"));
  assert.ok(metadata.files.some((file) => file.path === "docs/spec/language.md"));
  assert.ok(metadata.files.every((file) => (
    !file.path.startsWith(".github/")
    && !file.path.startsWith("scripts/")
  )));

  const tarball = resolve(packageDirectory, metadata.filename);
  await writeFile(
    resolve(projectDirectory, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  await execFileAsync(
    process.execPath,
    [
      npmCli,
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      tarball,
    ],
    {
      cwd: projectDirectory,
      env: {
        ...process.env,
        npm_config_cache: resolve(temporaryRoot, "npm-cache"),
      },
    },
  );
  const installedMetadata = JSON.parse(
    await readFile(resolve(installedPackage, "package.json"), "utf8"),
  );
  assert.equal(installedMetadata.bin.expresso, "src/cli.mjs");
  await execFileAsync(process.execPath, [expressoCli, "init"], {
    cwd: projectDirectory,
  });
  const checked = await execFileAsync(
    process.execPath,
    [expressoCli, "check", "expresso/refund.expresso"],
    { cwd: projectDirectory },
  );
  assert.match(checked.stdout, /VERIFIED/);
  await execFileAsync(
    process.execPath,
    [
      expressoCli,
      "compile",
      "expresso/refund.expresso",
      "--out",
      "expresso/refund.ir.json",
    ],
    { cwd: projectDirectory },
  );
  const ir = JSON.parse(
    await readFile(resolve(projectDirectory, "expresso/refund.ir.json"), "utf8"),
  );
  assert.equal(ir.irVersion, "1");

  const libraryProbe = resolve(projectDirectory, "library-probe.mjs");
  await writeFile(
    libraryProbe,
    [
      'import { execute, parse, verifyIR } from "@technodotventures/expresso";',
      'if (![execute, parse, verifyIR].every((value) => typeof value === "function")) {',
      '  throw new Error("Expected public library exports are missing.");',
      "}",
      "",
    ].join("\n"),
  );
  await execFileAsync(process.execPath, [libraryProbe], {
    cwd: projectDirectory,
  });

  const catalog = JSON.parse(
    await readFile(resolve(projectDirectory, "expresso/providers.json"), "utf8"),
  );
  assert.equal(catalog.catalogVersion, "1");
  process.stdout.write(
    `Package smoke test passed for ${metadata.name}@${metadata.version}.\n`,
  );
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
