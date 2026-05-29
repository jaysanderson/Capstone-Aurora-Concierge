import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Persona = 'sara' | 'mara';

export interface PersonaProfile {
  id: Persona;
  displayName: string;
  segment: 'Weekend Adventurer' | 'Thru-Hiker' | 'Alpine Pro';
  loyaltyTier: 'Prospect' | 'Trail Club Standard' | 'Trail Club Plus' | 'Trail Club Pro';
  region: 'NORAM' | 'EMEA' | 'APAC' | 'ANZ';
  voice: 'shopper' | 'member';
}

export const PERSONAS: Record<Persona, PersonaProfile> = {
  sara: {
    id: 'sara',
    displayName: 'Sara · prospect · Weekend Adventurer (NORAM)',
    segment: 'Weekend Adventurer',
    loyaltyTier: 'Prospect',
    region: 'NORAM',
    voice: 'shopper',
  },
  mara: {
    id: 'mara',
    displayName: 'Mara · Trail Club Pro · Alpine Pro (EMEA)',
    segment: 'Alpine Pro',
    loyaltyTier: 'Trail Club Pro',
    region: 'EMEA',
    voice: 'member',
  },
};

interface PersonaValue {
  active: PersonaProfile;
  setActive: (id: Persona) => void;
}

const PersonaContext = createContext<PersonaValue | undefined>(undefined);

export function PersonaProvider({ children }: { children: ReactNode }) {
  const [activeId, setActive] = useState<Persona>('sara');
  const value = useMemo(
    () => ({ active: PERSONAS[activeId], setActive }),
    [activeId],
  );
  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used inside PersonaProvider');
  return ctx;
}
