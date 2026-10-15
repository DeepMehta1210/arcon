const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@growth-os/shared-types",
    "@growth-os/copy-linter",
    "@growth-os/verifier",
    "@growth-os/agent-core",
    "@growth-os/scrapers",
  ],
};

module.exports = nextConfig;
