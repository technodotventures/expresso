import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generatedRoot = resolve(
  root,
  "plugins/expresso-agent-authoring/skills/build-expresso-agent/scripts/generated",
);
const mappings = [
  "src/compiler/compile.mjs",
  "src/core/diagnostics.mjs",
  "src/language/parser.mjs",
  "src/language/tokenizer.mjs",
  "src/providers/catalog.mjs",
  "src/verifier/provenance.mjs",
  "src/verifier/source-verifier.mjs",
  "providers/catalog.json",
];
const checkOnly = process.argv.includes("--check");
const packageMetadata = JSON.parse(
  await readFile(resolve(root, "package.json"), "utf8"),
);
const hashes = {};
const stale = [];

for (const relativePath of mappings) {
  const source = await readFile(resolve(root, relativePath));
  hashes[relativePath] = createHash("sha256").update(source).digest("hex");
  const destination = resolve(generatedRoot, relativePath);
  if (checkOnly) {
    let generated;
    try {
      generated = await readFile(destination);
    } catch {
      stale.push(relativePath);
      continue;
    }
    if (!source.equals(generated)) stale.push(relativePath);
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, source);
  }
}

const manifest = `${JSON.stringify({
  compilerPackage: packageMetadata.name,
  compilerVersion: packageMetadata.version,
  files: hashes,
}, null, 2)}\n`;
const manifestPath = resolve(generatedRoot, "manifest.json");

if (checkOnly) {
  let currentManifest = "";
  try {
    currentManifest = await readFile(manifestPath, "utf8");
  } catch {
    stale.push("manifest.json");
  }
  if (currentManifest !== manifest && !stale.includes("manifest.json")) {
    stale.push("manifest.json");
  }
  if (stale.length > 0) {
    process.stderr.write(
      `Plugin compiler bundle is stale:\n${stale.join("\n")}\n`,
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Plugin compiler bundle matches canonical source.\n");
  }
} else {
  await mkdir(generatedRoot, { recursive: true });
  await writeFile(manifestPath, manifest, "utf8");
  process.stdout.write(
    `Built plugin compiler bundle for ${packageMetadata.name}@${packageMetadata.version}.\n`,
  );
}
