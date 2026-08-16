#!/usr/bin/env node

import {
  access,
  copyFile,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatDiagnostic,
} from "./core/diagnostics.mjs";
import { parse } from "./language/parser.mjs";
import { loadCatalog } from "./providers/catalog.mjs";
import { verifyProgram } from "./verifier/source-verifier.mjs";
import { compile } from "./compiler/compile.mjs";
import {
  execute,
  OutcomeUnknownError,
} from "./runtime/execute.mjs";
import { MemoryJournal } from "./runtime/journal.mjs";
import { createSyntheticProviders } from "./runtime/synthetic-providers.mjs";
import { commandAdapter, fixtureAdapter } from "./harness/adapters.mjs";
import { loadTasks, runExperiment } from "./harness/run.mjs";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PACKAGE_CATALOG = resolve(PACKAGE_ROOT, "providers/catalog.json");
const EXAMPLE_WORKFLOW = resolve(PACKAGE_ROOT, "examples/refund.expresso");
const EXAMPLE_INPUT = resolve(PACKAGE_ROOT, "examples/refund.input.json");
const PACKAGE_METADATA = JSON.parse(
  await readFile(resolve(PACKAGE_ROOT, "package.json"), "utf8"),
);
const OPTION_DEFINITIONS = {
  "--json": { key: "json", takesValue: false },
  "--catalog": { key: "catalog", takesValue: true },
  "--out": { key: "out", takesValue: true },
  "--model-command": { key: "modelCommand", takesValue: true },
  "--max-rounds": { key: "maxRounds", takesValue: true },
};

const args = process.argv.slice(2);
const command = args.shift();

try {
  switch (command) {
    case "init":
      await initCommand(args);
      break;
    case "check":
      await checkCommand(args);
      break;
    case "compile":
      await compileCommand(args);
      break;
    case "demo":
      await demoCommand(args);
      break;
    case "experiment":
      await experimentCommand(args);
      break;
    case "version":
    case "--version":
    case "-v":
      if (args.length > 0) {
        throw new Error("version does not accept arguments.");
      }
      process.stdout.write(`${PACKAGE_METADATA.version}\n`);
      break;
    case "help":
    case "--help":
    case "-h":
    case undefined:
      help();
      break;
    default:
      throw new Error(`Unknown command '${command}'. Run 'expresso help'.`);
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

async function initCommand(commandArgs) {
  const options = parseOptions(commandArgs);
  if (options.positional.length > 1) {
    throw new Error("init accepts at most one target directory.");
  }
  const target = resolve(options.positional[0] ?? ".");
  const expressoDirectory = resolve(target, "expresso");
  const workflowPath = resolve(expressoDirectory, "refund.expresso");
  const catalogPath = resolve(expressoDirectory, "providers.json");
  const conflicts = [];
  for (const path of [workflowPath, catalogPath]) {
    if (await exists(path)) conflicts.push(path);
  }
  if (conflicts.length > 0) {
    throw new Error(
      `Refusing to overwrite existing Expresso files:\n${conflicts.join("\n")}`,
    );
  }

  await mkdir(expressoDirectory, { recursive: true });
  await copyFile(EXAMPLE_WORKFLOW, workflowPath);
  await copyFile(PACKAGE_CATALOG, catalogPath);
  process.stdout.write(`Initialized Expresso in ${expressoDirectory}\n\n`);
  process.stdout.write("Next:\n");
  process.stdout.write(
    `  npx @technodotventures/expresso check ${
      JSON.stringify(relative(process.cwd(), workflowPath))
    }\n`,
  );
}

async function checkCommand(commandArgs) {
  const options = parseOptions(commandArgs, ["catalog", "json"]);
  const file = requiredSinglePositional(
    options,
    "check requires exactly one .expresso file.",
  );
  const { source, catalog, result } = await checkFile(file, options.catalog);
  void source;
  emitResult(result, file, options.json);
  process.exitCode = result.ok ? (result.executable ? 0 : 2) : 1;
}

async function compileCommand(commandArgs) {
  const options = parseOptions(commandArgs, ["catalog", "json", "out"]);
  const file = requiredSinglePositional(
    options,
    "compile requires exactly one .expresso file.",
  );
  const source = await readFile(file, "utf8");
  const catalog = await loadCatalog(
    await resolveCatalogPath(options.catalog, file),
  );
  const parsed = parse(source);
  if (!parsed.ok) {
    emitResult(parsed, file, options.json);
    process.exitCode = 1;
    return;
  }
  const result = compile(parsed.ast, catalog, { source });
  if (!result.ok || !result.ir) {
    emitResult(result, file, options.json);
    process.exitCode = 1;
    return;
  }
  const output = `${JSON.stringify(result.ir, null, 2)}\n`;
  if (options.out) {
    await writeFile(resolve(options.out), output, "utf8");
    process.stdout.write(`Wrote ${resolve(options.out)}\n`);
  } else {
    process.stdout.write(output);
  }
  process.exitCode = result.executable ? 0 : 2;
}

async function demoCommand(commandArgs) {
  if (commandArgs.length > 1) {
    throw new Error("demo accepts at most one scenario.");
  }
  const scenario = commandArgs[0] ?? "lost-response";
  if (scenario !== "lost-response") {
    throw new Error("Only the 'lost-response' demo is available.");
  }
  const file = EXAMPLE_WORKFLOW;
  const source = await readFile(file, "utf8");
  const catalog = await loadCatalog(PACKAGE_CATALOG);
  const parsed = parse(source);
  const compiled = compile(parsed.ast, catalog, { source });
  if (!compiled.executable) {
    emitResult(compiled, file, false);
    process.exitCode = 1;
    return;
  }
  const input = JSON.parse(await readFile(EXAMPLE_INPUT, "utf8"));
  const synthetic = createSyntheticProviders({ failAfterRefundOnce: true });
  const journal = new MemoryJournal();
  const base = {
    ir: compiled.ir,
    catalog,
    providers: synthetic.providers,
    input,
    executionId: "demo-refund-1",
    runtimeGrants: [
      "ai.propose_refund",
      "payments.refund",
      "payments.lookup_refund",
    ],
    journal,
  };

  try {
    await execute(base);
  } catch (error) {
    if (!(error instanceof OutcomeUnknownError)) throw error;
    process.stdout.write("Attempt 1: provider succeeded, response was lost.\n");
  }
  const result = await execute(base);
  const state = synthetic.inspect();
  process.stdout.write("Attempt 2: runtime reconciled the planned action.\n");
  process.stdout.write(`${JSON.stringify({
    status: result.status,
    providerDispatches: state.dispatches,
    externalRefunds: Object.keys(state.refunds).length,
    journalEvents: journal.snapshot().map((entry) => entry.type),
  }, null, 2)}\n`);
}

async function experimentCommand(commandArgs) {
  const options = parseOptions(
    commandArgs,
    ["modelCommand", "maxRounds", "out"],
  );
  const file = requiredSinglePositional(
    options,
    "experiment requires exactly one task suite JSON file.",
  );
  const loaded = await loadTasks(file);
  const maxRounds = Number(options.maxRounds ?? 4);
  if (!Number.isInteger(maxRounds) || maxRounds < 1) {
    throw new Error("--max-rounds must be a positive integer.");
  }
  const adapter = options.modelCommand
    ? commandAdapter(options.modelCommand)
    : fixtureAdapter(loaded.tasksDirectory);
  const result = await runExperiment({
    ...loaded,
    adapter,
    maxRounds,
  });
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (options.out) {
    await writeFile(resolve(options.out), output, "utf8");
    process.stdout.write(`Wrote ${resolve(options.out)}\n`);
  } else {
    process.stdout.write(output);
  }
  process.exitCode = result.totals.verified === result.totals.tasks ? 0 : 1;
}

async function checkFile(file, catalogPath) {
  const source = await readFile(file, "utf8");
  const catalog = await loadCatalog(
    await resolveCatalogPath(catalogPath, file),
  );
  const parsed = parse(source);
  const result = parsed.ok ? verifyProgram(parsed.ast, catalog) : parsed;
  return { source, catalog, result };
}

async function resolveCatalogPath(requestedPath, sourcePath) {
  if (requestedPath) return resolve(requestedPath);
  if (sourcePath) {
    const adjacentCatalog = resolve(dirname(sourcePath), "providers.json");
    if (await exists(adjacentCatalog)) return adjacentCatalog;
  }
  const projectCatalog = resolve("expresso/providers.json");
  return await exists(projectCatalog) ? projectCatalog : PACKAGE_CATALOG;
}

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function emitResult(result, file, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (result.diagnostics.length === 0) {
    process.stdout.write(
      result.executable
        ? `VERIFIED ${file}\n`
        : `ADMISSIBLE BUT BLOCKED ${file}\n`,
    );
    return;
  }
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

function parseOptions(commandArgs, allowedOptions = []) {
  const result = { positional: [] };
  const allowed = new Set(allowedOptions);
  for (let index = 0; index < commandArgs.length; index += 1) {
    const value = commandArgs[index];
    const definition = OPTION_DEFINITIONS[value];
    if (definition) {
      if (!allowed.has(definition.key)) {
        throw new Error(`Option '${value}' is not valid for this command.`);
      }
      if (definition.takesValue) {
        const optionValue = commandArgs[++index];
        if (optionValue === undefined || optionValue.startsWith("-")) {
          throw new Error(`Option '${value}' requires a value.`);
        }
        result[definition.key] = optionValue;
      } else {
        result[definition.key] = true;
      }
    } else if (value.startsWith("-")) {
      throw new Error(`Unknown option '${value}'.`);
    } else {
      result.positional.push(value);
    }
  }
  return result;
}

function requiredSinglePositional(options, message) {
  if (options.positional.length !== 1) throw new Error(message);
  return resolve(options.positional[0]);
}

function help() {
  process.stdout.write(`Expresso language compiler and runtime CLI

Usage:
  expresso init [directory]
  expresso check <file> [--catalog <file>] [--json]
  expresso compile <file> [--catalog <file>] [--out <file>] [--json]
  expresso demo lost-response
  expresso experiment <tasks.json> [--model-command <executable>] [--max-rounds <n>] [--out <file>]
  expresso --version
`);
}
