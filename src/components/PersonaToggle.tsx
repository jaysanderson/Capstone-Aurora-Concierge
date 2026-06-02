import { PERSONAS, usePersona, type PersonaProfile } from '../context/PersonaContext';

interface PersonaToggleProps {
  className?: string;
}

function firstNameOf(profile: PersonaProfile): string {
  const head = profile.displayName.split(' · ')[0] ?? profile.displayName;
  return head.split(' ')[0] ?? head;
}

function tierLabel(profile: PersonaProfile): string {
  // Compact tier label for the secondary line.
  if (profile.loyaltyTier === 'Prospect') return 'Prospect';
  if (profile.loyaltyTier === 'Trail Club Pro') return 'Trail Club Pro';
  if (profile.loyaltyTier === 'Trail Club Plus') return 'Trail Club Plus';
  return 'Trail Club';
}

export function PersonaToggle({ className }: PersonaToggleProps): JSX.Element {
  const { active, setActive } = usePersona();
  const personas = Object.values(PERSONAS);

  return (
    <div className={`flex flex-col items-start gap-1.5 ${className ?? ''}`}>
      <div className="eyebrow-alpine">Switching the audience</div>
      <div className="rounded-2xl border border-sand-200 bg-white p-1.5 inline-flex items-center gap-1 shadow-sm">
        {personas.map((p) => {
          const isActive = p.id === active.id;
          const isProspect = p.voice === 'shopper';
          const firstName = firstNameOf(p);
          const initial = firstName.charAt(0).toUpperCase();

          const buttonClasses = isActive
            ? 'flex items-center gap-2 rounded-xl bg-alpine-500 text-white px-3 py-2 shadow-sm active:scale-[0.97] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50'
            : 'flex items-center gap-2 rounded-xl text-sand-700 hover:bg-sand-50 hover:text-alpine-700 px-3 py-2 active:scale-[0.97] transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-alpine-300 focus-visible:ring-offset-2 focus-visible:ring-offset-sand-50';

          const avatarBg = isActive
            ? 'bg-white/20 text-white'
            : isProspect
              ? 'bg-alpine-100 text-alpine-700'
              : 'bg-rust-100 text-rust-700';

          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(p.id)}
              aria-pressed={isActive}
              aria-label={`Switch to ${firstName} — ${tierLabel(p)} in ${p.region}`}
              className={buttonClasses}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full font-display text-xs ${avatarBg}`}
                aria-hidden="true"
              >
                {initial}
              </span>
              <span className="text-left">
                <span className="block text-sm font-semibold leading-tight">{firstName}</span>
                <span
                  className={`block text-[10px] uppercase tracking-wider leading-tight ${
                    isActive ? 'text-white/80' : 'text-sand-500'
                  }`}
                >
                  {tierLabel(p)} · {p.region}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
