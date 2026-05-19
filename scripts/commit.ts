import { execSync } from "node:child_process";

const commitMsg = await Bun.file(import.meta.dir + "/commit-msg.md").text();

const messages = commitMsg
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0)
  .map((line) => `-m "${line}"`);

const command = `git commit ${messages.join(" \\\n")}`;
console.log(`Running command:\n${command}`);
execSync(command);
