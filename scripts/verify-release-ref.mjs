import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageMetadata = JSON.parse(
  await readFile(resolve("package.json"), "utf8"),
);
const expectedTag = `v${packageMetadata.version}`;
const refType = process.env.GITHUB_REF_TYPE;
const refName = process.env.GITHUB_REF_NAME;

if (refType !== "tag" || refName !== expectedTag) {
  process.stderr.write(
    `Release publication requires tag '${expectedTag}'; `
      + `received ${refType ?? "unknown"} '${refName ?? "unknown"}'.\n`,
  );
  process.exitCode = 1;
} else {
  process.stdout.write(
    `Release ref '${refName}' matches ${packageMetadata.name}@`
      + `${packageMetadata.version}.\n`,
  );
}
