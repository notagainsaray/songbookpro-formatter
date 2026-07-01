import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the dev server's client resources (HMR websocket, fonts, etc.) to be
  // reached when the app is opened via the machine's LAN IP instead of
  // localhost — e.g. http://192.168.1.81:3001 from a phone or another device.
  // Without this, Next 16 blocks those cross-origin dev requests, the page
  // never hydrates, and every button appears dead. Dev-only; no effect on
  // production builds. Add more hosts here if your LAN IP changes.
  allowedDevOrigins: ["192.168.1.81"],
};

export default nextConfig;
