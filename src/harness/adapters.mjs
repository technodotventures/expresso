import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

export function fixtureAdapter(tasksDirectory) {
  return {
    name: "fixture",
    async generate({ task, attempt }) {
      const selected = task.attemptFiles[
        Math.min(attempt - 1, task.attemptFiles.length - 1)
      ];
      return readFile(resolve(tasksDirectory, selected), "utf8");
    },
  };
}

export function commandAdapter(command) {
  return {
    name: command,
    async generate(request) {
      const response = await invoke(command, request);
      if (typeof response.source !== "string") {
        throw new Error("Model command must return JSON containing a source string.");
      }
      return response;
    },
  };
}

function invoke(command, request) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, [], {
      stdio: ["pipe", "pipe", "pipe"],
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Model command exited ${code}: ${stderr.trim()}`));
        return;
      }
      try {
        resolvePromise(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`Model command returned invalid JSON: ${error.message}`));
      }
    });
    child.stdin.end(JSON.stringify(request));
  });
}
