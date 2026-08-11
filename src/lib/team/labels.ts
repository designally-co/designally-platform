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

/**
 * Packages that are no longer sold but are still stored on old rows. Labelled
 * rather than left blank, so an archived project reads as what it was.
 */
const RETIRED_LABEL: Record<string, string> = {
  branding: 'Branding (retired)',
  website: 'Website (retired)',
  both: 'Branding + Website (retired)',
};

export function packageLabel(pkg: string): string {
  return PACKAGE_LABEL[pkg as Package] ?? RETIRED_LABEL[pkg] ?? pkg;
}

export function packageFull(pkg: string): string {
  return PACKAGE_FULL[pkg as Package] ?? RETIRED_LABEL[pkg] ?? pkg;
}
