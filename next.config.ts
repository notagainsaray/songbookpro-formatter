import type { NextConfig } from "next";
import { readFileSync } from "node:fs";

// When building for GitHub Pages (the deploy build sets GITHUB_PAGES=true),
// the app is emitted as a static site served from the repository's subpath:
// https://notagainsaray.github.io/songbookpro-formatter/. Locally and on other
// hosts this stays off, so `next dev`, `next start`, and the tests are
// unaffected.
const isPages = process.env.GITHUB_PAGES === "true";
const repo = "songbookpro-formatter";
const pkg = JSON.parse(readFileSync("./package.json", "utf8"));

const nextConfig: NextConfig = {
  // Expose the deployed version (from package.json) and the build's commit to
  // the client bundle; the page footer shows them so it's clear what is live.
  env: {
    NEXT_PUBLIC_APP_VERSION: pkg.version,
    NEXT_PUBLIC_COMMIT: process.env.APP_COMMIT ?? "",
  },
  // Allow the dev server's client resources (HMR websocket, fonts, etc.) to be
  // reached when the app is opened via the machine's LAN IP instead of
  // localhost — e.g. http://192.168.1.81:3001 from a phone or another device.
  // Without this, Next 16 blocks those cross-origin dev requests, the page
  // never hydrates, and every button appears dead. Dev-only; no effect on
  // production builds. Add more hosts here if your LAN IP changes.
  allowedDevOrigins: ["192.168.1.81"],
};

if (isPages) {
  nextConfig.output = "export"; // static HTML/CSS/JS into ./out
  nextConfig.basePath = `/${repo}`; // project site lives under /<repo>
  nextConfig.images = { unoptimized: true }; // no image optimizer in a static export
  nextConfig.trailingSlash = true; // emit an index.html per route for static hosting
}

export default nextConfig;
