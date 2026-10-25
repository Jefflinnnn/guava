import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    // `next dev` logs every server action call with its arguments, which
    // would print Neon connection strings and Plaid secrets to the terminal.
    serverFunctions: false,
  },
};

export default nextConfig;
