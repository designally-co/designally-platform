import type { Package } from '@/lib/db/schema';

/** Shared by the team app and the analysis. Pure — safe in a client bundle. */
export const PACKAGE_LABEL: Record<Package, string> = {
  branding: 'Branding',
  website: 'Website',
  both: 'Branding + Website',
};
