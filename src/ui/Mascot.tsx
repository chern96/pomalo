// Točka – a small Dalmatian puppy, drawn as inline SVG in four moods.

export type Mood = 'happy' | 'cheer' | 'comfort' | 'sleep';

const OUT = '#1b2a30';
const FUR = '#ffffff';

export function Mascot({ mood = 'happy', size = 140, bob = false }: { mood?: Mood; size?: number; bob?: boolean }) {
  const eyes =
    mood === 'sleep' ? (
      <g stroke={OUT} stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M44 60 q6 5 12 0" />
        <path d="M66 60 q6 5 12 0" />
      </g>
    ) : mood === 'happy' ? (
      <g stroke={OUT} stroke-width="3.5" stroke-linecap="round" fill="none">
        <path d="M44 60 q6 -7 12 0" />
        <path d="M66 60 q6 -7 12 0" />
      </g>
    ) : (
      <g>
        <ellipse cx="50" cy="58" rx="5.5" ry={mood === 'comfort' ? 5 : 6.5} fill={OUT} />
        <ellipse cx="72" cy="58" rx="5.5" ry={mood === 'comfort' ? 5 : 6.5} fill={OUT} />
        <circle cx="52" cy="56" r="1.8" fill="#fff" />
        <circle cx="74" cy="56" r="1.8" fill="#fff" />
        {mood === 'comfort' && (
          <g stroke={OUT} stroke-width="2.5" stroke-linecap="round">
            <path d="M43 48 l8 -3" />
            <path d="M79 48 l-8 -3" />
          </g>
        )}
      </g>
    );

  const mouth =
    mood === 'sleep' ? (
      <path d="M56 80 q5 3 10 0" stroke={OUT} stroke-width="2.5" fill="none" stroke-linecap="round" />
    ) : mood === 'comfort' ? (
      <path d="M54 81 q7 4 14 0" stroke={OUT} stroke-width="2.5" fill="none" stroke-linecap="round" />
    ) : (
      <g>
        <path d="M52 78 q9 14 18 0 z" fill="#c94c3f" stroke={OUT} stroke-width="2.5" stroke-linejoin="round" />
        <path d="M57 84 q4 6 8 0" fill="#ef8a7e" />
      </g>
    );

  return (
    <svg class={`mascot${bob ? ' bob' : ''}`} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Točka, der kleine Dalmatiner">
      {/* body */}
      <ellipse cx="61" cy="104" rx="30" ry="14" fill={FUR} stroke={OUT} stroke-width="3" />
      <circle cx="45" cy="104" r="4" fill={OUT} />
      <circle cx="76" cy="100" r="3" fill={OUT} />
      {mood === 'cheer' && (
        <g>
          <path d="M92 92 q12 -14 6 -30" stroke={OUT} stroke-width="3" fill={FUR} stroke-linecap="round" />
          <ellipse cx="98" cy="60" rx="7" ry="6" fill={FUR} stroke={OUT} stroke-width="3" />
          <g fill="#f5b72a">
            <path d="M104 40 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" />
            <circle cx="88" cy="44" r="2.5" />
          </g>
        </g>
      )}
      {/* ears */}
      <path d="M30 40 q-14 6 -10 30 q3 10 12 4 q4 -16 6 -28z" fill={OUT} />
      <path d="M92 40 q14 6 10 30 q-3 10 -12 4 q-4 -16 -6 -28z" fill={OUT} />
      {/* head */}
      <ellipse cx="61" cy="62" rx="33" ry="30" fill={FUR} stroke={OUT} stroke-width="3" />
      {/* spots */}
      <circle cx="40" cy="44" r="5" fill={OUT} />
      <circle cx="80" cy="40" r="3.5" fill={OUT} />
      <circle cx="86" cy="72" r="4" fill={OUT} />
      <circle cx="35" cy="72" r="2.8" fill={OUT} />
      <circle cx="62" cy="38" r="2.6" fill={OUT} />
      {eyes}
      {/* muzzle */}
      <ellipse cx="61" cy="74" rx="13" ry="9" fill="#f3efe6" />
      <ellipse cx="61" cy="70" rx="6" ry="4.5" fill={OUT} />
      {mouth}
      {mood !== 'sleep' && (
        <g fill="#ef6a5b" opacity="0.35">
          <circle cx="40" cy="70" r="5" />
          <circle cx="82" cy="70" r="5" />
        </g>
      )}
      {/* collar with tag */}
      <path d="M38 88 q23 12 46 0" stroke="#0e8f9a" stroke-width="6" fill="none" stroke-linecap="round" />
      <circle cx="61" cy="96" r="4.5" fill="#f5b72a" stroke={OUT} stroke-width="1.5" />
      {mood === 'sleep' && (
        <g fill={OUT} font-weight="800" font-family="system-ui, sans-serif">
          <text x="92" y="30" font-size="14">z</text>
          <text x="102" y="20" font-size="11">z</text>
        </g>
      )}
      {mood === 'comfort' && <path d="M100 30 c-4 -6 -12 -1 -6 6 l6 6 6 -6 c6 -7 -2 -12 -6 -6z" fill="#ef6a5b" />}
    </svg>
  );
}
