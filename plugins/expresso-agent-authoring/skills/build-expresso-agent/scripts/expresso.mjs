#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { formatDiagnostic } from "./generated/src/core/diagnostics.mjs";
import { parse } from "./generated/src/language/parser.mjs";
import { loadCatalog } from "./generated/src/providers/catalog.mjs";
import { verifyProgram } from "./generated/src/verifier/source-verifier.mjs";

const args = process.argv.slice(2);
const command = args.shift();

try {
  if (command === "help" || command === "--help" || !command) {
    help();
  } else if (command === "check") {
    await check(args);
  } else {
    throw new Error(`Unknown command '${command}'.`);
  }
} catch (error) {
  if (error.diagnostics) {
    for (const item of error.diagnostics) {
      process.stderr.write(`${formatDiagnostic(item)}\n`);
    }
  } else {
    process.stderr.write(`ERROR: ${error.message}\n`);
  }
  process.exitCode = 1;
}

async function check(commandArgs) {
  const options = parseOptions(commandArgs);
  if (!options.file) throw new Error("check requires a .expresso file.");
  const file = resolve(options.file);
  const catalogPath = options.catalog
    ? resolve(options.catalog)
    : new URL("./generated/providers/catalog.json", import.meta.url);
  const source = await readFile(file, "utf8");
  const catalog = await loadCatalog(catalogPath);
  const parsed = parse(source);
  const result = parsed.ok ? verifyProgram(parsed.ast, catalog) : parsed;

  if (options.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const item of result.diagnostics) {
      process.stdout.write(`${formatDiagnostic(item, file)}\n`);
    }
    process.stdout.write(
      result.executable
        ? `VERIFIED ${file}\n`
        : result.ok
          ? `ADMISSIBLE BUT BLOCKED ${file}\n`
          : `REJECTED ${file}\n`,
    );
  }
  process.exitCode = result.ok ? (result.executable ? 0 : 2) : 1;
}

function parseOptions(commandArgs) {
  const options = {};
  for (let index = 0; index < commandArgs.length; index += 1) {
    const value = commandArgs[index];
    if (value === "--catalog") {
      options.catalog = commandArgs[++index];
    } else if (value === "--json") {
      options.json = true;
    } else if (!options.file) {
      options.file = value;
    } else {
      throw new Error(`Unexpected argument '${value}'.`);
    }
  }
  return options;
}

function help() {
  process.stdout.write(`Expresso authoring checker

Usage:
  node expresso.mjs check <file> [--catalog <file>] [--json]
`);
}
