import { useState } from 'react';
import { askForJson, type AnswerJsonSchema } from '../lib/askForJson';
import { compositeAsk, type CompositeResult } from '../lib/compositeRag';
import { PipelineSteps } from '../components/PipelineSteps';
import { Citations } from '../components/Citations';
import saraFixture from '../fixtures/sara-session.json';

const WINBACK_SCHEMA: AnswerJsonSchema = {
  name: 'winback_message',
  description: 'Structured abandoned-cart winback message dropping into Klaviyo / Braze.',
  parameters: {
    type: 'object',
    properties: {
      subject_line: { type: 'string' },
      body: { type: 'string' },
      cta_label: { type: 'string' },
      cta_url: { type: 'string' },
      cross_sell_products: { type: 'array', items: { type: 'string' } },
      ambassador_quote: {
        type: 'object',
        properties: { quote: { type: 'string' }, attribution: { type: 'string' }, source_url: { type: 'string' } },
        required: ['quote', 'attribution', 'source_url'],
      },
      send_window: { type: 'string' },
    },
    required: ['subject_line', 'body', 'cta_label', 'cta_url', 'cross_sell_products', 'ambassador_quote', 'send_window'],
  },
};

export function AbandonedCart() {
  const [composite, setComposite] = useState<CompositeResult | null>(null);
  const [winback, setWinback] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setError(null);
    setComposite(null);
    setWinback(null);
    try {
      const query =
        `Sara is a Weekend Adventurer based in NA. She abandoned a cart 36 hours ago with the Aurora TerraTrek 7 (US M 8, Slate). ` +
        `What's the best winback message? Use Aurora trail guides, gear reviews, ambassador content, and loyalty content. ` +
        `Include cross-sell products that pair with TerraTrek 7 from the journey graph, and an ambassador quote.`;
      const c = await compositeAsk({
        query,
        initialFilters: ['/classification.labels/content_type/product'],
        graphSeedEntities: [
          { value: 'Aurora TerraTrek 7', group: 'PRODUCT' },
          { value: 'Mara Chen', group: 'AMBASSADOR' },
        ],
      });
      setComposite(c);
      // Final structured winback drawing on the augmented context.
      const w = await askForJson({
        query: `${query}\n\nGround everything in the retrieved context. Suggest a send window in the customer's local time.`,
        schema: WINBACK_SCHEMA,
      });
      setWinback(w);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header>
        <h1 className="font-display text-3xl text-sand-900">Abandoned-cart win-back · Composite RAG</h1>
        <p className="mt-1 text-sm text-sand-700">
          Four-step composite-RAG pipeline produces a structured win-back message that drops into Klaviyo / Braze / Iterable in three lines.
        </p>
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-rust-500">Customer fixture</h2>
          <pre className="mt-3 max-h-[360px] overflow-auto rounded-md bg-sand-100 p-3 font-mono text-xs text-sand-900">
            {JSON.stringify(saraFixture, null, 2)}
          </pre>
          <button type="button" className="btn-primary mt-4 w-full" onClick={run} disabled={running}>
            {running ? 'Running pipeline…' : 'Generate winback'}
          </button>
          {error && <pre className="mt-4 whitespace-pre-wrap text-xs text-rust-600">{error}</pre>}
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-rust-500">Pipeline</h2>
            <div className="mt-3">
              <PipelineSteps steps={composite?.steps ?? []} />
            </div>
          </div>

          {winback != null ? (
            <div className="card border-alpine-500">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-alpine-600">Winback message · structured</h2>
              <pre className="mt-3 max-h-[400px] overflow-auto rounded-md bg-sand-100 p-3 font-mono text-xs text-sand-900">
                {JSON.stringify(winback, null, 2)}
              </pre>
              {composite && <Citations citations={composite.citations} />}
            </div>
          ) : (
            <div className="card text-sm text-sand-500">Pipeline output renders here. Drops into Klaviyo / Braze in 3 lines.</div>
          )}
        </div>
      </div>
    </div>
  );
}
