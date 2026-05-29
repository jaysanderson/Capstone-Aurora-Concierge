import { Route, Routes } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { FloatingChat } from './components/FloatingChat';
import { Landing } from './pages/Landing';
import { Storefront } from './pages/Storefront';
import { ForYou } from './pages/ForYou';
import { Concierge } from './pages/Concierge';
import { Personalize } from './pages/Personalize';
import { JourneyGraph } from './pages/JourneyGraph';
import { AbandonedCart } from './pages/AbandonedCart';
import { ByoLlmProvider } from './context/ByoLlmContext';
import { LanguageProvider } from './context/LanguageContext';
import { ResidencyProvider } from './context/ResidencyContext';
import { PersonaProvider } from './context/PersonaContext';
import { loadEnv } from './lib/env';

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
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/storefront" element={<Storefront />} />
                  <Route path="/for-you" element={<ForYou />} />
                  <Route path="/concierge" element={<Concierge />} />
                  <Route path="/personalize" element={<Personalize />} />
                  <Route path="/journey-graph" element={<JourneyGraph />} />
                  <Route path="/abandoned-cart" element={<AbandonedCart />} />
                  <Route path="*" element={<Landing />} />
                </Routes>
              </main>
              <Footer />
              <FloatingChat />
            </div>
          </PersonaProvider>
        </LanguageProvider>
      </ByoLlmProvider>
    </ResidencyProvider>
  );
}
