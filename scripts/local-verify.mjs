import { spawn } from "node:child_process";

await run("pnpm", ["db:setup"]);
await run("pnpm", ["typecheck"]);
await run("pnpm", ["build"]);
await run("pnpm", ["test:api"]);
await run("pnpm", ["db:setup"]);

console.log("FlowForge verification passed");

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} failed with exit code ${code}`));
    });
  });
}
