import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getResource, ResourceNotFoundError, type ResourceDoc } from '../lib/ragClient';
import { contentTypeLabel } from '../lib/contentTypes';
import { ResourceMarkdown } from '../components/ResourceMarkdown';
import { EmptyState, ErrorPanel } from '../components/States';

function BackLink() {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => {
        // Prefer in-app history; fall back to the storefront on a cold deep-link.
        if (window.history.length > 1) navigate(-1);
        else navigate('/storefront');
      }}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-alpine-700 transition hover:text-alpine-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50 rounded"
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
        <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Back
    </button>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mx-auto max-w-2xl animate-pulse" aria-busy="true" aria-live="polite">
      <div className="h-3 w-24 rounded-full bg-sand-200" />
      <div className="mt-4 h-9 w-3/4 rounded bg-sand-200" />
      <div className="mt-8 space-y-3">
        <div className="h-4 w-full rounded bg-sand-100" />
        <div className="h-4 w-11/12 rounded bg-sand-100" />
        <div className="h-4 w-10/12 rounded bg-sand-100" />
        <div className="h-4 w-9/12 rounded bg-sand-100" />
      </div>
    </div>
  );
}

export function ResourceViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<ResourceDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    getResource(id)
      .then((d) => {
        if (!cancelled) setDoc(d);
      })
      .catch((e) => {
        if (cancelled) return;
        if (e instanceof ResourceNotFoundError) setNotFound(true);
        else setError((e as Error).message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, reloadKey]);

  return (
    <section className="container-editorial">
      <div className="mb-8">
        <BackLink />
      </div>

      {loading && <LoadingSkeleton />}

      {!loading && notFound && (
        <div className="mx-auto max-w-2xl">
          <EmptyState
            title="We couldn't find that resource"
            body="The document may have moved, or the link is out of date. Browse the storefront to find what you're after."
            actionLabel="Back to the storefront"
            onAction={() => navigate('/storefront')}
          />
        </div>
      )}

      {!loading && !notFound && error && (
        <div className="mx-auto max-w-2xl">
          <ErrorPanel message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      )}

      {!loading && !notFound && !error && doc && (
        <article className="mx-auto max-w-2xl fade-in-up">
          <header>
            <span className="eyebrow">{contentTypeLabel(doc.contentType)}</span>
            <h1 className="h-page mt-2">{doc.title}</h1>
          </header>

          <div className="mt-10">
            {doc.body ? (
              <ResourceMarkdown body={doc.body} />
            ) : (
              <p className="text-sm text-sand-600">This resource has no document body to display.</p>
            )}
          </div>

          <div className="mt-12 border-t border-sand-200 pt-6">
            <Link to="/storefront" className="btn-ghost">
              Browse more resources
            </Link>
          </div>
        </article>
      )}
    </section>
  );
}
