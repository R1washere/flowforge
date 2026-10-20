import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const databaseHost = new URL(databaseUrl).hostname;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);
if (process.env.NODE_ENV === "production" || !localHosts.has(databaseHost)) {
  throw new Error("Refusing to reset a production or remote database");
}

await run("node", ["node_modules/prisma/build/index.js", "generate"]);
await run("node", [
  "node_modules/prisma/build/index.js",
  "migrate",
  "reset",
  "--force",
]);
await run("node", ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("close", (code) => {
      if (code === 0) return resolve();
      reject(
        new Error(`${command} ${args.join(" ")} failed with exit code ${code}`),
      );
    });
  });
}
