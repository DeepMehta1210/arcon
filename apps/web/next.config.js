const path = require("node:path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
  transpilePackages: [
    "@arcon/shared-types",
    "@arcon/copy-linter",
    "@arcon/verifier",
    "@arcon/agent-core",
    "@arcon/scrapers",
    "@arcon/database",
    "@arcon/doc-generator",
    "@arcon/outbound-email",
  ],
};

module.exports = nextConfig;
