import * as fs from "node:fs";
import * as path from "node:path";

const semver = require("semver") as {
  satisfies(version: string, range: string): boolean;
};

it("keeps every locked dependency engine compatible with the Mac Mini Node version", () => {
  const root = path.resolve(__dirname, "../..");
  const version = fs.readFileSync(path.join(root, ".nvmrc"), "utf8").trim();
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const incompatible = Object.entries(lock.packages)
    .filter(
      ([, pkg]: [string, any]) =>
        pkg.engines?.node && !semver.satisfies(version, pkg.engines.node),
    )
    .map(([name, pkg]: [string, any]) => ({
      name,
      required: pkg.engines.node,
    }));
  expect(incompatible).toEqual([]);
});

it("retains macOS optional binaries in the cross-platform lockfile", () => {
  const root = path.resolve(__dirname, "../..");
  const lock = JSON.parse(
    fs.readFileSync(path.join(root, "package-lock.json"), "utf8"),
  );
  const missing: string[] = [];
  for (const pkg of Object.values(lock.packages) as any[]) {
    for (const [name, required] of Object.entries(
      pkg.optionalDependencies ?? {},
    )) {
      if (!name.includes("darwin")) continue;
      const present = Object.entries(lock.packages).some(
        ([key, candidate]: [string, any]) =>
          key.endsWith(`node_modules/${name}`) &&
          semver.satisfies(candidate.version, String(required)),
      );
      if (!present) missing.push(`${name}@${required}`);
    }
  }
  expect(missing).toEqual([]);
});
