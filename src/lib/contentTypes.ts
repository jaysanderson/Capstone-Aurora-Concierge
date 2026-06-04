/**
 * Shared content_type → human label map. Single source of truth used by the
 * storefront cards and the resource viewer so the eyebrow/label wording stays
 * consistent across surfaces.
 */
export const CONTENT_TYPE_LABEL: Record<string, string> = {
  product: 'Product',
  trail_guide: 'Trail guide',
  gear_review: 'Gear review',
  ambassador_video: 'Ambassador story',
  loyalty_benefit: 'Loyalty perk',
  brand_story: 'Brand story',
  brand_pillar: 'Brand pillar',
};

export function contentTypeLabel(contentType?: string): string {
  return (contentType && CONTENT_TYPE_LABEL[contentType]) || 'Resource';
}
