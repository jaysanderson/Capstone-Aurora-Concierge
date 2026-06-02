import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

const PERSONA_STORAGE_KEY = 'aurora.persona.active';

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

function readStoredPersona(): Persona {
  if (typeof window === 'undefined') return 'sara';
  try {
    const raw = window.localStorage.getItem(PERSONA_STORAGE_KEY);
    if (raw === 'sara' || raw === 'mara') return raw;
  } catch {
    // ignore — localStorage may be unavailable (private mode / SSR)
  }
  return 'sara';
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  // Hydrate from localStorage on first render so the choice survives
  // navigation, refresh, and StrictMode double-mounts.
  const [activeId, setActiveId] = useState<Persona>(() => readStoredPersona());

  useEffect(() => {
    try {
      window.localStorage.setItem(PERSONA_STORAGE_KEY, activeId);
    } catch {
      // ignore write failures
    }
  }, [activeId]);

  const value = useMemo(
    () => ({ active: PERSONAS[activeId], setActive: setActiveId }),
    [activeId],
  );
  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaValue {
  const ctx = useContext(PersonaContext);
  if (!ctx) throw new Error('usePersona must be used inside PersonaProvider');
  return ctx;
}
