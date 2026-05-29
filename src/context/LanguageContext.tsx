import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface LanguageValue {
  active: string;
  available: string[];
  set: (lang: string) => void;
}

const LanguageContext = createContext<LanguageValue | undefined>(undefined);

export function LanguageProvider({
  initial,
  available,
  children,
}: {
  initial: string;
  available: string[];
  children: ReactNode;
}) {
  const [active, set] = useState<string>(initial);
  const value = useMemo(() => ({ active, available, set }), [active, available]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
