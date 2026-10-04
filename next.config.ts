import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  // GitAgent loads modules dynamically at runtime, which the bundler cannot follow.
  serverExternalPackages: ["@open-gitagent/gitagent"],
}

export default nextConfig
