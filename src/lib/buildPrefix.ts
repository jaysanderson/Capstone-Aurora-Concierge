/**
 * buildPrefix — adds language / segment / resource-scope levers to a query.
 *
 * Pattern from Foundations Build 4. Reused verbatim here so the chassis
 * is ready when partners reskin Atlas Operations for a customer with
 * multilingual or multi-segment requirements.
 */

export interface PrefixOptions {
  language?: string;
  segment?: string;
  resourceTitle?: string;
}

export function buildPrefix(opts: PrefixOptions): string {
  const parts: string[] = [];
  if (opts.language && opts.language.trim().toLowerCase() !== 'english') {
    parts.push(`Respond in ${opts.language.trim()}: `);
  }
  if (opts.segment && opts.segment.trim()) {
    parts.push(`The user is a ${opts.segment.trim()}. Frame your answer accordingly. `);
  }
  if (opts.resourceTitle && opts.resourceTitle.trim()) {
    parts.push(`Regarding the resource titled "${opts.resourceTitle.trim()}": `);
  }
  return parts.join('');
}
