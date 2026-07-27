import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The old prototypes live in archive/ and are not part of the build.
  outputFileTracingExcludes: { "*": ["./archive/**"] },
};

export default nextConfig;
