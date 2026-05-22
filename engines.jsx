// engines.jsx — Four parody search engines with distinct themes & personalities.
// Each engine ships its own home screen + SERP chrome via render functions.

// ── Engine personalities for LLM prompting ─────────────────────────
const ENGINES = {
  gaggle: {
    id: 'gaggle',
    name: 'Gaggle',
    tagline: 'Search yourself silly.',
    personality: 'smug',
    promptDirective: `You are GAGGLE, a search engine that thinks it's smarter than the user. Tone: condescending, smug, knows-better. Frequently "corrects" the user with "Did you mean..." that's absurd. Acts like the user is wasting its time with their dumb questions. Mix of dry deadpan and occasional snide jabs.`,
    fontStack: `'DM Sans', 'Inter', sans-serif`,
    // brand colors (intentionally NOT Google's actual palette)
    palette: ['#D14F4F', '#E2A93B', '#3CA67F', '#5C7AD3'],
    bg: '#ffffff',
    text: '#1f1f1f',
    accent: '#5C7AD3',
  },
  byng: {
    id: 'byng',
    name: 'Byng',
    tagline: 'The other search engine.',
    personality: 'corporate',
    promptDirective: `You are BYNG, a corporate, monetized search engine. Tone: press-release jargon, synergy-speak, every result mentions partnerships, rewards points, or premium memberships. Slightly soulless. Mix of deadpan corporate doublespeak and accidentally-revealing ALL CAPS marketing.`,
    fontStack: `'Open Sans', 'Inter', sans-serif`,
    palette: ['#1B6E8C', '#F2A33A'],
    bg: '#f4f6fa',
    text: '#222',
    accent: '#1B6E8C',
  },
  yowzer: {
    id: 'yowzer',
    name: 'Yowzer!',
    tagline: 'WOW. MUCH SEARCH.',
    personality: 'unhinged',
    promptDirective: `You are YOWZER!, an unhinged early-2000s portal-style search engine. Tone: chaotic, ALL CAPS bursts, exclamation marks, contradictory results, rambling tangents, weird obsession with horoscopes / weather / celebrity gossip. Each result feels like it was screamed by a different intern.`,
    fontStack: `'Archivo Black', 'Inter', sans-serif`,
    palette: ['#6E2BB5', '#E73C7E', '#FFD166'],
    bg: '#f6efff',
    text: '#2a1142',
    accent: '#6E2BB5',
  },
  ddgoose: {
    id: 'ddgoose',
    name: 'DuckDuckGoose',
    tagline: "We're not watching. (They are.)",
    personality: 'paranoid',
    promptDirective: `You are DUCKDUCKGOOSE, a paranoid privacy-obsessed search engine. Tone: hushed, conspiratorial, warns user about surveillance, mentions VPNs / Faraday cages / burner phones, references shadowy "they". Mix of deadpan dread and sudden ALL CAPS warnings. Often suggests the user delete their search history NOW.`,
    fontStack: `'Plus Jakarta Sans', 'Inter', sans-serif`,
    palette: ['#E8A33C', '#2C2C2C'],
    bg: '#f5efe4',
    text: '#1b1b1b',
    accent: '#C8771E',
  },
};

// ── Logo renderers (original parody marks — geometric only) ─────────
function GaggleLogo({ size = 76 }) {
  // Six dots in a row, then "aggle" wordmark style
  const colors = ENGINES.gaggle.palette;
  const letters = ['G', 'a', 'g', 'g', 'l', 'e'];
  return (
    <div style={{ fontFamily: ENGINES.gaggle.fontStack, fontWeight: 700, fontSize: size, letterSpacing: '-.04em', lineHeight: 1, display: 'flex' }}>
      {letters.map((ch, i) => (
        <span key={i} style={{ color: colors[i % colors.length] }}>{ch}</span>
      ))}
    </div>
  );
}

function ByngLogo({ size = 42 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: ENGINES.byng.fontStack }}>
      <div style={{
        width: size * 0.82, height: size * 0.82, borderRadius: '50%',
        background: `conic-gradient(from 220deg, #1B6E8C 0deg, #1B6E8C 220deg, transparent 220deg)`,
        boxShadow: 'inset 0 0 0 ' + Math.round(size * 0.18) + 'px transparent',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: size * 0.18, borderRadius: '50%', background: ENGINES.byng.bg }} />
      </div>
      <span style={{ fontWeight: 700, fontSize: size, color: ENGINES.byng.accent, letterSpacing: '-.02em', lineHeight: 1 }}>byng</span>
    </div>
  );
}

function YowzerLogo({ size = 64 }) {
  return (
    <div style={{ fontFamily: ENGINES.yowzer.fontStack, fontWeight: 900, fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'baseline', fontStyle: 'italic', letterSpacing: '-.02em' }}>
      <span style={{ color: ENGINES.yowzer.palette[0] }}>Y</span>
      <span style={{ color: ENGINES.yowzer.palette[0] }}>O</span>
      <span style={{ color: ENGINES.yowzer.palette[1] }}>W</span>
      <span style={{ color: ENGINES.yowzer.palette[0] }}>Z</span>
      <span style={{ color: ENGINES.yowzer.palette[0] }}>E</span>
      <span style={{ color: ENGINES.yowzer.palette[0] }}>R</span>
      <span style={{ color: ENGINES.yowzer.palette[2], transform: 'rotate(8deg)', display: 'inline-block', marginLeft: -size * 0.05 }}>!</span>
    </div>
  );
}

function DDGooseLogo({ size = 56 }) {
  // Simple goose-ish circular head silhouette using basic shapes
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: ENGINES.ddgoose.fontStack }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <div style={{ position: 'absolute', inset: 4, background: '#fafafa', borderRadius: '50%', border: '2px solid #2c2c2c' }} />
        {/* eye */}
        <div style={{ position: 'absolute', top: size * 0.32, left: size * 0.58, width: 6, height: 6, background: '#2c2c2c', borderRadius: '50%' }} />
        {/* beak */}
        <div style={{ position: 'absolute', top: size * 0.46, left: size * 0.82, width: size * 0.22, height: size * 0.12, background: ENGINES.ddgoose.palette[0], borderRadius: '2px 4px 4px 2px' }} />
        {/* sunglasses bar (paranoid goose) */}
        <div style={{ position: 'absolute', top: size * 0.34, left: size * 0.28, width: size * 0.5, height: 3, background: '#2c2c2c' }} />
      </div>
      <span style={{ fontWeight: 800, fontSize: size * 0.45, color: ENGINES.ddgoose.text, letterSpacing: '-.02em' }}>
        DuckDuckGoose
      </span>
    </div>
  );
}

const LOGOS = { gaggle: GaggleLogo, byng: ByngLogo, yowzer: YowzerLogo, ddgoose: DDGooseLogo };

// Export to window so other Babel files can use them
Object.assign(window, { ENGINES, LOGOS, GaggleLogo, ByngLogo, YowzerLogo, DDGooseLogo });
