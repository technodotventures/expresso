import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { copyFile, cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const pluginRoot = resolve("plugins/expresso-agent-authoring");
const checker = resolve(
  pluginRoot,
  "skills/build-expresso-agent/scripts/expresso.mjs",
);

test("plugin metadata and generated compiler version stay aligned", async () => {
  const plugin = JSON.parse(
    await readFile(resolve(pluginRoot, ".codex-plugin/plugin.json"), "utf8"),
  );
  const generated = JSON.parse(
    await readFile(
      resolve(
        pluginRoot,
        "skills/build-expresso-agent/scripts/generated/manifest.json",
      ),
      "utf8",
    ),
  );
  const marketplace = JSON.parse(
    await readFile(resolve(".agents/plugins/marketplace.json"), "utf8"),
  );
  const claudePlugin = JSON.parse(
    await readFile(resolve(pluginRoot, ".claude-plugin/plugin.json"), "utf8"),
  );
  const claudeMarketplace = JSON.parse(
    await readFile(resolve(".claude-plugin/marketplace.json"), "utf8"),
  );

  assert.equal(plugin.name, "expresso");
  assert.equal(plugin.version, "0.3.2");
  assert.equal(plugin.homepage, "https://expresso.build");
  assert.equal(plugin.author.url, "https://www.techno.ventures");
  assert.ok(plugin.interface.displayName.length <= 30);
  assert.ok(plugin.interface.shortDescription.length <= 30);
  assert.ok(
    plugin.interface.defaultPrompt.every((prompt) => prompt.length <= 128),
  );
  assert.equal(generated.compilerPackage, "@technodotventures/expresso");
  assert.equal(generated.compilerVersion, plugin.version);
  assert.equal(marketplace.name, "expresso");
  assert.equal(marketplace.plugins[0].name, plugin.name);
  assert.equal(
    marketplace.plugins[0].source.path,
    "./plugins/expresso-agent-authoring",
  );
  assert.equal(claudePlugin.name, plugin.name);
  assert.equal(claudePlugin.version, plugin.version);
  assert.equal(claudePlugin.homepage, plugin.homepage);
  assert.equal(claudePlugin.author.url, plugin.author.url);
  assert.equal(claudePlugin.skills, "./skills/");
  assert.equal(claudeMarketplace.name, "expresso");
  assert.equal(claudeMarketplace.owner.url, plugin.author.url);
  assert.equal(claudeMarketplace.plugins[0].name, claudePlugin.name);
  assert.equal(
    claudeMarketplace.plugins[0].source,
    "./plugins/expresso-agent-authoring",
  );
});

test("bundled checker works from an unrelated project", async (t) => {
  const project = await mkdtemp(resolve(tmpdir(), "expresso-plugin-test-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  await copyFile(resolve("examples/refund.expresso"), resolve(project, "agent.expresso"));

  const checked = await execFileAsync(
    process.execPath,
    [checker, "check", "agent.expresso"],
    { cwd: project },
  );
  assert.match(checked.stdout, /VERIFIED/);
});

test("Claude marketplace plugin remains self-contained after caching", async (t) => {
  const cache = await mkdtemp(resolve(tmpdir(), "expresso-claude-plugin-"));
  const cachedPlugin = resolve(cache, "expresso");
  const project = resolve(cache, "project");
  t.after(() => rm(cache, { recursive: true, force: true }));

  await cp(pluginRoot, cachedPlugin, { recursive: true });
  await cp(resolve("examples"), project, { recursive: true });

  const cachedManifest = JSON.parse(
    await readFile(resolve(cachedPlugin, ".claude-plugin/plugin.json"), "utf8"),
  );
  assert.equal(cachedManifest.name, "expresso");

  const cachedChecker = resolve(
    cachedPlugin,
    "skills/build-expresso-agent/scripts/expresso.mjs",
  );
  const checked = await execFileAsync(
    process.execPath,
    [cachedChecker, "check", "refund.expresso"],
    { cwd: project },
  );
  assert.match(checked.stdout, /VERIFIED/);
});

test("bundled checker returns repair diagnostics for unsafe source", async (t) => {
  const project = await mkdtemp(resolve(tmpdir(), "expresso-plugin-invalid-"));
  t.after(() => rm(project, { recursive: true, force: true }));
  await copyFile(
    resolve("experiments/fixtures/refund.invalid.expresso"),
    resolve(project, "unsafe.expresso"),
  );

  await assert.rejects(
    execFileAsync(
      process.execPath,
      [checker, "check", "unsafe.expresso", "--json"],
      { cwd: project },
    ),
    (error) => {
      const result = JSON.parse(error.stdout);
      const codes = new Set(result.diagnostics.map((item) => item.code));
      return error.code === 1 && codes.has("E202") && codes.has("E203");
    },
  );
});
