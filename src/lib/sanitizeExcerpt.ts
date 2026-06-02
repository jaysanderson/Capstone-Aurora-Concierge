/**
 * sanitizeExcerpt — strip raw markdown + filename leakage out of resource
 * excerpts so they render as clean retail copy, not raw doc source.
 *
 * Used anywhere a KB document body is shown directly to a shopper:
 *  - StorefrontCard description (Storefront, ForYou)
 *  - JourneyGraph related-content rail
 *
 * Rules:
 *  - Drop any line starting with one or more '#' (heading lines).
 *  - Drop any line that is markdown table syntax (`| col | col |` or `| -- |`).
 *  - Strip "see <file>.md" / "from <file>.md" / standalone `.md` filenames.
 *  - Convert '**Label:**' or '**Label**' to plain 'Label:' / 'Label'.
 *  - Collapse runs of whitespace / blank lines.
 *  - Trim and truncate at the last full sentence within maxLength, falling
 *    back to a word boundary if no sentence terminator is close enough.
 */
export function sanitizeExcerpt(
  input: string | undefined | null,
  maxLength = 240,
): string | undefined {
  if (!input) return undefined;
  const cleaned = input
    // Drop heading lines + markdown table rows entirely.
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (/^#{1,6}\s+/.test(trimmed)) return false;
      // Table rows: `| ... |` or alignment row `|---|---|`
      if (/^\|.*\|?\s*$/.test(trimmed) && trimmed.includes('|')) return false;
      // Pure alignment row e.g. `|---|---|`
      if (/^[\s|:-]+$/.test(trimmed) && trimmed.includes('-')) return false;
      return true;
    })
    .join('\n')
    // Strip "see X.md" / "from X.md" / "in X.md" patterns + standalone .md
    // filenames so internal source paths never leak to customers.
    .replace(/\b(see|from|in|via|per|cf\.?)\s+[A-Za-z0-9_-]+\.md\b\.?/gi, '')
    .replace(/\b[A-Za-z0-9_-]+\.(md|markdown|txt|json|yaml|yml)\b/g, '')
    // **Label:** -> Label:    /    **Label** -> Label
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // Strip leftover markdown emphasis (`_x_`, `*x*`).
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1$2')
    .replace(/(^|[^_])_([^_\n]+)_/g, '$1$2')
    // Strip residual pipe characters that survived the row-drop (inline `|`).
    .replace(/\s\|\s/g, ' — ')
    // Collapse 3+ newlines to a single blank line, then any whitespace runs.
    .replace(/\n{2,}/g, '\n')
    .replace(/[ \t]+/g, ' ')
    // Empty parentheticals + bracketed refs left over from filename stripping:
    //   "Repair-for-Life perks (see ``)"    -> "Repair-for-Life perks"
    //   "in alpine guides ( )"             -> "in alpine guides"
    //   "[]"                                -> ""
    .replace(/\s*\([^)]{0,3}\)/g, '')
    .replace(/\s*\[\s*\]/g, '')
    .replace(/\s*`+\s*`+/g, '')
    // Drop dangling sentence fragments left over from filename stripping
    // (e.g. "see ." -> "" or "  ." -> ".")
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',')
    .trim();
  if (!cleaned) return undefined;
  if (cleaned.length <= maxLength) return cleaned;
  // Prefer to truncate at the last sentence boundary inside maxLength.
  // Look back from maxLength for a `.`, `!`, or `?` followed by space or EOS.
  const slice = cleaned.slice(0, maxLength);
  const sentenceEnd = Math.max(
    slice.lastIndexOf('. '),
    slice.lastIndexOf('! '),
    slice.lastIndexOf('? '),
    slice.lastIndexOf('.\n'),
    slice.lastIndexOf('!\n'),
    slice.lastIndexOf('?\n'),
  );
  if (sentenceEnd > Math.max(80, maxLength * 0.55)) {
    return cleaned.slice(0, sentenceEnd + 1).trimEnd();
  }
  // Fallback: word boundary + ellipsis.
  const lastSpace = slice.lastIndexOf(' ');
  return (lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trimEnd() + '…';
}

/**
 * Build a believable Aurora storefront/content URL for a resource so CTAs in
 * front of a CMO go SOMEWHERE (a new tab on the brand-fiction site) instead
 * of href="#". Returns a stable URL derived from content type + cleaned title.
 */
export function ctaHrefFor(opts: {
  contentType?: string;
  title?: string;
  fallbackId?: string;
}): string {
  const origin = 'https://aurora-outfitters.com';
  const slugSource = (opts.title ?? opts.fallbackId ?? '').replace(/^#+\s*/, '').trim();
  const slug = slugSource
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
  switch (opts.contentType) {
    case 'product':           return `${origin}/products/${slug}`;
    case 'trail_guide':       return `${origin}/trails/${slug}`;
    case 'gear_review':       return `${origin}/reviews/${slug}`;
    case 'ambassador_video':  return `${origin}/ambassadors/${slug}`;
    case 'loyalty_benefit':   return `${origin}/trail-club/${slug}`;
    case 'brand_pillar':      return `${origin}/our-promise/${slug}`;
    default:                  return `${origin}/discover/${slug}`;
  }
}
