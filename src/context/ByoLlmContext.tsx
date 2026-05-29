import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ByoLlmProvider } from '../lib/env';

interface ByoLlmContextValue {
  active: ByoLlmProvider;
  available: ByoLlmProvider[];
  set: (provider: ByoLlmProvider) => void;
}

const ByoLlmContext = createContext<ByoLlmContextValue | undefined>(undefined);

export function ByoLlmProvider({
  initial,
  available,
  children,
}: {
  initial: ByoLlmProvider;
  available: ByoLlmProvider[];
  children: ReactNode;
}) {
  const [active, set] = useState<ByoLlmProvider>(initial);
  const value = useMemo(() => ({ active, available, set }), [active, available]);
  return <ByoLlmContext.Provider value={value}>{children}</ByoLlmContext.Provider>;
}

export function useByoLlm(): ByoLlmContextValue {
  const ctx = useContext(ByoLlmContext);
  if (!ctx) throw new Error('useByoLlm must be used inside ByoLlmProvider');
  return ctx;
}

export const PROVIDER_LABELS: Record<ByoLlmProvider, string> = {
  'azure-openai': 'Azure OpenAI',
  'google-vertex': 'Google Vertex',
  'aws-bedrock': 'AWS Bedrock',
};
