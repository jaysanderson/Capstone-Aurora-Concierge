import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface ResidencyValue {
  region: 'EU' | 'US';
  set: (r: 'EU' | 'US') => void;
}

const ResidencyContext = createContext<ResidencyValue | undefined>(undefined);

export function ResidencyProvider({
  initial,
  children,
}: {
  initial: 'EU' | 'US';
  children: ReactNode;
}) {
  const [region, set] = useState<'EU' | 'US'>(initial);
  const value = useMemo(() => ({ region, set }), [region]);
  return <ResidencyContext.Provider value={value}>{children}</ResidencyContext.Provider>;
}

export function useResidency(): ResidencyValue {
  const ctx = useContext(ResidencyContext);
  if (!ctx) throw new Error('useResidency must be used inside ResidencyProvider');
  return ctx;
}
