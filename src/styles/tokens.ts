export const palette = {
  sand: '#faf7f2',
  surface: '#ffffff',
  border: '#e8d9bf',
  text: '#241910',
  muted: '#7a5a2b',
  alpine: '#286b88',
  alpineBright: '#4099b9',
  rust: '#c45a2c',
} as const;

export const entityColours: Record<string, string> = {
  PRODUCT: '#c45a2c',
  CATEGORY: '#7a5a2b',
  ACTIVITY: '#286b88',
  DESTINATION: '#4099b9',
  AMBASSADOR: '#a37b3f',
  CONTENT: '#9fd0e2',
  CUSTOMER_SEGMENT: '#df7a4a',
  LOYALTY_TIER: '#c69e63',
  BRAND_PILLAR: '#583f1f',
  SIZING_PROFILE: '#6cb6d1',
};

export const fallbackEntityColour = '#cbd5e1';

export function colourForGroup(group: string): string {
  return entityColours[group?.toUpperCase?.() ?? ''] ?? fallbackEntityColour;
}
