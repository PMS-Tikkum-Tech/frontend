import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const failures = [];

const walk = (directory) => {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};

const assertNoPattern = (paths, patterns, label) => {
  paths.forEach((path) => {
    const content = readFileSync(path, "utf8");
    patterns.forEach((pattern) => {
      if (pattern.test(content)) {
        failures.push(`${label}: ${relative(root, path)} matched ${pattern}`);
      }
    });
  });
};

const sourceFiles = [
  ...walk(join(root, "src")),
  join(root, "package.json"),
  join(root, "package-lock.json"),
  join(root, ".env.example"),
].filter(existsSync);

const legacyAuthPatterns = [
  /firebase(?:\/auth|\/app|app\.com|storage\.app)/i,
  /identitytoolkit\.googleapis\.com/i,
  /accounts\.google\.com\/gsi/i,
  /NEXT_PUBLIC_FIREBASE_/i,
  /NEXT_PUBLIC_GOOGLE_CLIENT_ID/i,
  /kyra\.auth\.session/i,
  /kyra_role/i,
];

assertNoPattern(sourceFiles, legacyAuthPatterns, "legacy auth source");

const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (packageJson.dependencies?.firebase || packageJson.devDependencies?.firebase) {
  failures.push("firebase dependency is present");
}

const bundleFiles = [
  ...walk(join(root, ".next", "static")),
  ...walk(join(root, ".next", "server")),
].filter((path) => !path.endsWith(".map"));
assertNoPattern(bundleFiles, legacyAuthPatterns, "legacy auth bundle");

const publicSourceMaps = walk(join(root, ".next", "static"))
  .filter((path) => path.endsWith(".map"));
if (publicSourceMaps.length > 0) {
  failures.push("browser source maps are present in .next/static");
}

[
  "src/app/auth/forgot-password/page.tsx",
  "src/app/auth/reset-password/page.tsx",
  "src/app/robots.ts",
  "src/app/sitemap.ts",
].forEach((path) => {
  if (!existsSync(join(root, path))) failures.push(`required file missing: ${path}`);
});

if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("Security regression checks passed.");
