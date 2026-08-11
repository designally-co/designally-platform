import type { Package } from '@/lib/db/schema';

/** Shared by the team app and the analysis. Pure — safe in a client bundle. */
export const PACKAGE_LABEL: Record<Package, string> = {
  brand: 'Brand',
  design: 'Design',
};

/** The full name, for the client-facing survey header and the new survey sheet. */
export const PACKAGE_FULL: Record<Package, string> = {
  brand: 'Brand Strategy + Brand Identity',
  design: 'Design',
};
