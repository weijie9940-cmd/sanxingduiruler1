#!/usr/bin/env node
/**
 * Static build for Tencent EdgeOne Pages (`npm run build:edgeone`).
 *
 * The public site is a couple of prerenderable pages (the portfolio home `/`
 * and the 3D exhibit `/sanxingdui`) with no server features in use (auth is
 * off in .grok/app-env.json, no database, no API routes), so it ships as plain
 * static files — no EdgeOne functions needed.
 *
 * 1. `vite build` with DEPLOY_TARGET=edgeone: vite.config.ts then skips the
 *    Vercel Nitro server and has TanStack Start prerender `/` into
 *    dist/client/index.html and `/sanxingdui` into dist/client/sanxingdui/index.html.
 * 2. Re-create statically what the Nitro middleware (server/middleware/grok-pwa.ts)
 *    adds at request time on Vercel: the web manifest and the PWA / share-card
 *    head tags. The grok.com banner script is left out (VITE_GROK_EXTENSIONS=0).
 *    Set VITE_PUBLIC_HOSTNAME (e.g. xina-official.cn) to get an absolute og:image.
 * 3. Fail if any file exceeds EdgeOne's 25 MiB single-file limit.
 *
 * Output directory for EdgeOne: dist/client
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { projectRoot } from "./with-app-env.mjs";

const root = projectRoot();
const outDir = join(root, "dist", "client");
const MAX_FILE_BYTES = 25 * 1024 * 1024;

process.env.DEPLOY_TARGET = "edgeone";
process.env.VITE_GROK_EXTENSIONS = "0";

const build = spawnSync(
  process.execPath,
  [join(root, "scripts", "with-app-env.mjs"), "vite", "build"],
  { cwd: root, stdio: "inherit", env: process.env },
);
if (build.status !== 0) process.exit(build.status ?? 1);

/**
 * Prerendered pages (see PRERENDER_PAGES in vite.config.ts). `ogTitle` overrides
 * the share-card title from src/lib/og/site.json for that page only.
 */
const PAGES = [
  { file: "index.html", ogTitle: "Xina · 作品集" },
  { file: join("sanxingdui", "index.html") },
];
for (const page of PAGES) {
  if (!existsSync(join(outDir, page.file))) {
    console.error(`[edgeone] dist/client/${page.file} missing — prerender did not run.`);
    process.exit(1);
  }
}

// Imported after the build so its env reads see the values set above.
const { injectGrokPwaHead, readOgSite, renderWebManifest } = await import(
  "./grok-pwa-shared.mjs"
);
const host = process.env.VITE_PUBLIC_HOSTNAME ?? "";
const appName = String(readOgSite(root).title ?? "").trim();

const manifest = JSON.parse(renderWebManifest(host));
if (appName) {
  manifest.name = appName;
  manifest.short_name = appName;
}
mkdirSync(join(outDir, "__grok"), { recursive: true });
const manifestJson = `${JSON.stringify(manifest, null, 2)}\n`;
writeFileSync(join(outDir, "__grok", "manifest.webmanifest"), manifestJson);
writeFileSync(join(outDir, "__grok", "manifest.json"), manifestJson);

const ogSite = readOgSite(root);
for (const page of PAGES) {
  const pagePath = join(outDir, page.file);
  const html = readFileSync(pagePath, "utf8");
  const site = page.ogTitle ? { ...ogSite, title: page.ogTitle } : undefined;
  writeFileSync(pagePath, injectGrokPwaHead(html, { host, cwd: root, site }));
}

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [{ path: full, size: statSync(full).size }];
  });
}
const files = walk(outDir).sort((a, b) => b.size - a.size);
const total = files.reduce((sum, f) => sum + f.size, 0);
const mb = (n) => `${(n / 1024 / 1024).toFixed(2)} MB`;
console.log(`[edgeone] ${files.length} files, ${mb(total)} total in dist/client. Largest:`);
for (const f of files.slice(0, 5)) {
  console.log(`  ${mb(f.size).padStart(9)}  ${relative(outDir, f.path).replaceAll("\\", "/")}`);
}
const tooBig = files.filter((f) => f.size > MAX_FILE_BYTES);
if (tooBig.length > 0) {
  console.error("[edgeone] files over EdgeOne's 25 MiB single-file limit:");
  for (const f of tooBig) console.error(`  ${relative(outDir, f.path)}`);
  process.exit(1);
}
console.log("[edgeone] static site ready — deploy dist/client.");
