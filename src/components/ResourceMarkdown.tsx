import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/**
 * Renders a KB document's Markdown to the Aurora design system. No
 * @tailwindcss/typography in the repo, so element styling is mapped explicitly
 * to the existing type scale (Fraunces display headings, Inter body, JetBrains
 * mono code). GFM enables tables (gear specs) + strikethrough + task lists.
 *
 * Link policy (no new dead links): a real external http(s) link opens safely in
 * a new tab; the brand-fiction host (aurora-outfitters.com), relative paths and
 * .md filenames render as plain text, never as a dead anchor.
 */
function AnchorRenderer({ href, children }: ComponentPropsWithoutRef<'a'>) {
  const url = String(href ?? '');
  const isExternal = /^https?:\/\//i.test(url);
  const isFiction = /aurora-outfitters\.com/i.test(url);
  if (isExternal && !isFiction) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="text-alpine-600 underline decoration-alpine-300 underline-offset-2 hover:text-alpine-700"
      >
        {children}
      </a>
    );
  }
  return <span className="text-sand-800">{children}</span>;
}

const components = {
  h1: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-8 font-display text-2xl font-medium tracking-tight text-sand-900">{children}</h2>
  ),
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-8 font-display text-xl font-medium tracking-tight text-sand-900">{children}</h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-6 text-base font-semibold text-sand-900">{children}</h3>
  ),
  h4: ({ children }: { children?: ReactNode }) => (
    <h4 className="mt-6 text-sm font-semibold uppercase tracking-[0.08em] text-sand-700">{children}</h4>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-4 text-[15px] leading-relaxed text-sand-800">{children}</p>
  ),
  ul: ({ children }: { children?: ReactNode }) => (
    <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-sand-800 marker:text-alpine-400">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: ReactNode }) => (
    <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed text-sand-800 marker:text-sand-500">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: ReactNode }) => <li className="pl-1">{children}</li>,
  a: AnchorRenderer,
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-sand-900">{children}</strong>
  ),
  em: ({ children }: { children?: ReactNode }) => <em className="italic">{children}</em>,
  blockquote: ({ children }: { children?: ReactNode }) => (
    <blockquote className="pull-quote mt-6">{children}</blockquote>
  ),
  hr: () => <hr className="my-8 border-0 border-t border-sand-200" />,
  code: ({ children }: { children?: ReactNode }) => (
    <code className="rounded bg-sand-100 px-1.5 py-0.5 font-mono text-[13px] text-sand-800">{children}</code>
  ),
  pre: ({ children }: { children?: ReactNode }) => (
    <pre className="mt-4 overflow-x-auto rounded-xl bg-sand-900 p-4 font-mono text-[13px] leading-relaxed text-sand-50">
      {children}
    </pre>
  ),
  table: ({ children }: { children?: ReactNode }) => (
    <div className="mt-6 overflow-x-auto rounded-xl border border-sand-200">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: ReactNode }) => <thead className="bg-sand-50">{children}</thead>,
  th: ({ children }: { children?: ReactNode }) => (
    <th className="border-b border-sand-300 px-3 py-2 text-left font-semibold text-sand-900">{children}</th>
  ),
  td: ({ children }: { children?: ReactNode }) => (
    <td className="border-b border-sand-100 px-3 py-2 align-top text-sand-800">{children}</td>
  ),
  img: ({ src, alt }: ComponentPropsWithoutRef<'img'>) => (
    <img src={src} alt={alt ?? ''} className="mt-4 rounded-xl border border-sand-200" />
  ),
};

export function ResourceMarkdown({ body }: { body: string }) {
  return (
    <div className="[&>*:first-child]:mt-0">
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {body}
      </Markdown>
    </div>
  );
}
