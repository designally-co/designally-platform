import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * PGlite ships its own WASM and Node filesystem layer; bundling it breaks
   * both. Only the local development database uses it — Supabase runs through
   * postgres-js.
   */
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
