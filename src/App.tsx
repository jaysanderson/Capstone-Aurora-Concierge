import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingChat } from './components/FloatingChat';
import { LearnHowThisWorks } from './components/LearnHowThisWorks';
import { TopoBackdrop } from './components/TopoBackdrop';
import { Landing } from './pages/Landing';
import { Storefront } from './pages/Storefront';
import { ForYou } from './pages/ForYou';
import { Concierge } from './pages/Concierge';
import { Personalize } from './pages/Personalize';
import { JourneyGraph } from './pages/JourneyGraph';
import { AbandonedCart } from './pages/AbandonedCart';
import { NotFound } from './pages/NotFound';
import { ByoLlmProvider } from './context/ByoLlmContext';
import { LanguageProvider } from './context/LanguageContext';
import { ResidencyProvider } from './context/ResidencyContext';
import { PersonaProvider } from './context/PersonaContext';
import { loadEnv } from './lib/env';

/**
 * Reset scroll position to the top of the document on every route change.
 * Without this, navigating to a new page can leave the viewport mid-scroll
 * (clipped under the sticky header) because react-router keeps the previous
 * scrollY by default. Runs after the route commits so the new page paints
 * at scrollY=0.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);
  return null;
}

export default function App() {
  let env;
  try { env = loadEnv(); } catch (e) {
    return (
      <div className="grid min-h-screen place-items-center px-4 text-center">
        <div className="max-w-xl rounded-2xl border border-rust-400 bg-rust-50 p-6 text-sm text-rust-700">
          <div className="font-display text-xl text-rust-700">Aurora Concierge — environment not configured</div>
          <p className="mt-3 whitespace-pre-wrap text-left">{(e as Error).message}</p>
        </div>
      </div>
    );
  }
  return (
    <ResidencyProvider initial={env.region}>
      <ByoLlmProvider initial={env.byoLlmDefault} available={env.byoLlmProviders}>
        <LanguageProvider initial={env.languages[0] ?? 'English'} available={env.languages}>
          <PersonaProvider>
            <ScrollToTop />
            <div className="flex min-h-screen flex-col">
              <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.025]" aria-hidden="true">
                <TopoBackdrop />
              </div>
              <Header />
              {/* pb-24 reserves vertical space at the bottom so the fixed
                  "Learn how this works" pill (bottom-left) never overlaps
                  card body text on scroll. */}
              <main id="main-content" tabIndex={-1} className="flex-1 pb-24 focus:outline-none">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/storefront" element={<Storefront />} />
                  <Route path="/for-you" element={<ForYou />} />
                  <Route path="/concierge" element={<Concierge />} />
                  <Route path="/personalize" element={<Personalize />} />
                  <Route path="/journey-graph" element={<JourneyGraph />} />
                  <Route path="/abandoned-cart" element={<AbandonedCart />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <FloatingChat />
              <LearnHowThisWorks />
            </div>
          </PersonaProvider>
        </LanguageProvider>
      </ByoLlmProvider>
    </ResidencyProvider>
  );
}
