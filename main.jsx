// app.jsx — NotGoogleSearch main app
// Home screen → SERP with auto-typing + fake cursor → ad-click fade-out → home with pre-fill
// Stores searches in localStorage keyed by 8-char ID, replayable via #id=XXXXXXXX hash.

const { useState, useEffect, useRef, useCallback } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "typingSpeedMs": 80,
  "preSearchDelayMs": 3000,
  "fadeOutMs": 3000,
  "adsEnabled": true,
  "wanderSweepMs": 1400,
  "wanderHoverMs": 2200,
  "wanderJitterPx": 18,
  "wanderCurviness": 0.55
}/*EDITMODE-END*/;

// ─── ID / storage helpers ────────────────────────────────────────────
// Firebase Realtime DB URL — paste your DB URL here when ready.
// Example: 'https://notgoogle-xxxxx-default-rtdb.firebaseio.com/'
// While empty, the app falls back to localStorage (per-device only).
//Heads up on Firebase security: "test mode" rules expire after 30 days and are fully public. For a YouTube prop site that's usually fine, //but when it expires you'll either need to renew the rules or change them to something like { "rules": { ".read": true, ".write": //true } } for unrestricted access.
const FIREBASE_DB_URL = 'https://notsearch-97b18-default-rtdb.asia-southeast1.firebasedatabase.app/';

const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/I/1
const ID_LEN = 8;
function makeId() {
  let s = '';
  for (let i = 0; i < ID_LEN; i++) s += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  return s;
}
const LS_PREFIX = 'ngs:';

function saveRunLocal(id, data) {
  try { localStorage.setItem(LS_PREFIX + id, JSON.stringify(data)); } catch {}
}
function loadRunLocal(id) {
  try {
    const raw = localStorage.getItem(LS_PREFIX + id.toUpperCase());
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function saveRunRemote(id, data) {
  if (!FIREBASE_DB_URL) return;
  try {
    await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/runs/${id}.json`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  } catch (e) { console.warn('Firebase save failed', e); }
}
async function loadRunRemote(id) {
  if (!FIREBASE_DB_URL) return null;
  try {
    const r = await fetch(`${FIREBASE_DB_URL.replace(/\/$/, '')}/runs/${id.toUpperCase()}.json`);
    if (!r.ok) return null;
    const data = await r.json();
    return data || null;
  } catch (e) { console.warn('Firebase load failed', e); return null; }
}

// Combined save: write to both, fire-and-forget remote.
function saveRun(id, data) {
  saveRunLocal(id, data);
  saveRunRemote(id, data);
}
// Combined load: local first (instant), then remote (cached locally on hit).
async function loadRunAsync(id) {
  const up = id.toUpperCase();
  const local = loadRunLocal(up);
  if (local) return local;
  const remote = await loadRunRemote(up);
  if (remote) saveRunLocal(up, remote); // cache for next time
  return remote;
}
// Sync-only load (best-effort, local cache only). Used where awaiting is awkward.
function loadRunSyncOnly(id) { return loadRunLocal(id); }

// ─── LLM result generation ───────────────────────────────────────────
async function generateResults(topic, engineId, count = 6) {
  const eng = ENGINES[engineId];
  const adCategories = AD_KEYS;
  const prompt = `${eng.promptDirective}

The user searched for: "${topic}"

Generate exactly ${count} search results as a JSON array. Mix dry/deadpan and loud/chaotic comedy.
- 1 of the ${count} results MUST be marked isAd:true with adCategory from ${JSON.stringify(adCategories)} — written in the voice of the engine.
- The remaining results are organic but absurd / wrong / unhelpful. Vary tone.
- One result should be a confidently-wrong "Did you mean:" correction (for Gaggle especially: include "didYouMean" string on the first result).

Return ONLY a valid JSON object: {"didYouMean": "absurd misreading of topic", "results": [{title, url, snippet, isAd?, adCategory?}, ...]}

URLs should look real but be fake — e.g. "https://wikiposterous.org/wiki/...", "https://reddit.fake/r/...", "https://stackoverview.io/...". Snippets are 1–2 sentences, in-character.

No prose. No markdown. ONLY the JSON object.`;

  try {
    const raw = await window.claude.complete(prompt);
    // attempt to extract JSON
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no json');
    const parsed = JSON.parse(match[0]);
    const results = (parsed.results || []).slice(0, count);
    if (parsed.didYouMean && results[0]) results[0].didYouMean = parsed.didYouMean;
    return results.length ? results : fallbackResults(topic, engineId, count);
  } catch (e) {
    console.warn('LLM gen failed, using fallback', e);
    return fallbackResults(topic, engineId, count);
  }
}

function fallbackResults(topic, engineId, count) {
  const eng = ENGINES[engineId];
  const t = topic.toLowerCase();
  const base = [
    { title: `Why ${topic} is your fault, actually`, url: 'wikiposterous.org/Blame', snippet: `Experts confirm that ${topic} is, statistically, 87% your responsibility. Click here to feel worse.` },
    { title: `${topic} — Forum thread from 2009 with no answers`, url: 'forumz.fake/thread/2009', snippet: `User "DadOf3" asks the same question. 47 replies, none helpful. Last activity: 2011.` },
    { title: `Top 10 ways to ignore ${topic}`, url: 'listacle.net/ignore', snippet: `Number 4 will absolutely not surprise you. It's "go to bed".` },
    { title: `${topic}: A Reddit thread that devolved into politics`, url: 'reddit.fake/r/help', snippet: `OP last seen 3 hours ago. The argument is now about pickup trucks.` },
    { title: `Stop searching this. — A Letter from your Mother`, url: 'mom.example/letter', snippet: `Honey, just call me. I told you about ${topic} in 2017.` },
  ];
  const adCat = AD_KEYS[Math.floor(Math.random() * AD_KEYS.length)];
  const ad = pickAd(Math.random(), adCat);
  const adResult = { title: ad.headline, url: `${adCat}.example/${topic.split(' ')[0]}`, snippet: ad.sub, isAd: true, adCategory: adCat, ad };
  const out = base.slice(0, count - 1);
  out.splice(1, 0, adResult);
  out[0].didYouMean = topic.split('').reverse().join('').slice(0, 16);
  return out.slice(0, count);
}

// ─── Fake cursor component ───────────────────────────────────────────
function FakeCursor({ pos, clicking, hidden, style, transition = true }) {
  // 'classic' arrow, 'hand' cartoon, 'system' (invisible — uses real system cursor)
  if (style === 'system') return null;
  const isHand = style === 'hand';
  return (
    <div className={`fake-cursor ${clicking ? 'clicking' : ''} ${hidden ? 'hidden' : ''} ${transition ? '' : 'no-trans'}`}
         style={{ top: pos.y, left: pos.x }}>
      {isHand ? (
        <svg width="42" height="50" viewBox="0 0 42 50">
          <path d="M14 4 L14 26 L10 22 Q6 18 4 22 Q3 25 6 28 L16 42 Q19 46 24 46 L32 46 Q38 46 38 40 L38 22 Q38 18 34 18 Q32 18 31 20 L31 14 Q31 10 27 10 Q25 10 24 12 L24 8 Q24 4 20 4 Q18 4 17 6 L17 4 Q17 0 14 0 Q11 0 11 4 Z"
            fill="#ffe6b8" stroke="#222" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="22" height="28" viewBox="0 0 22 28">
          <path d="M2 1 L2 22 L7 18 L11 26 L14 25 L10 17 L17 17 Z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

function spawnRipple(x, y) {
  const el = document.createElement('div');
  el.className = 'click-ripple';
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 600);
}

// ─── Home screen ─────────────────────────────────────────────────────
function HomeScreen({ initialTopic, onLaunch }) {
  const [topic, setTopic] = useState(initialTopic || '');
  const [engineId, setEngineId] = useState('gaggle');
  const [cursorStyle, setCursorStyle] = useState('classic');
  const [lookingUp, setLookingUp] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const t = topic.trim();
    if (!t) return;
    // Replay path: if topic looks like an ID, try local then remote.
    if (/^[A-Za-z0-9]{8}$/.test(t)) {
      setLookingUp(true);
      const saved = await loadRunAsync(t);
      setLookingUp(false);
      if (saved) {
        window.location.hash = '#id=' + t.toUpperCase();
        return;
      }
    }
    onLaunch({ topic: t, engineId, cursorStyle });
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#fafaf7', color: '#1a1a1a',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 36,
    }}>
      <div style={{ textAlign: 'center', maxWidth: 720 }}>
        <div style={{ fontFamily: 'Archivo Black, Inter, sans-serif', fontSize: 'clamp(48px, 7vw, 84px)', lineHeight: 1, letterSpacing: '-.03em', marginBottom: 12 }}>
          Not<span style={{ color: '#D14F4F' }}>G</span><span style={{ color: '#E2A93B' }}>o</span><span style={{ color: '#5C7AD3' }}>o</span><span style={{ color: '#3CA67F' }}>g</span><span style={{ color: '#D14F4F' }}>l</span><span style={{ color: '#E2A93B' }}>e</span><span style={{ color: '#6E2BB5' }}>Search</span>
        </div>
        <div style={{ fontSize: 16, color: '#666', fontFamily: 'ui-monospace, Menlo, monospace' }}>
          A simulation. A re-enactment. A waste of your afternoon.
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 22 }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 8 }}>
            What are you about to embarrass yourself searching for?
          </label>
          <input ref={inputRef} value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="how to glue my finger back on"
            style={{
              width: '100%', padding: '14px 18px', fontSize: 17, fontFamily: 'inherit',
              border: '1.5px solid #1a1a1a', borderRadius: 8, background: '#fff', outline: 'none',
            }} />
          <div style={{ fontSize: 11, color: '#999', marginTop: 6, fontFamily: 'ui-monospace, Menlo, monospace' }}>
            tip: type an 8-char ID (e.g. K7P3MX9V) to replay a saved search
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
            Choose your search engine
          </label>
          <div className="home-engines" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {Object.values(ENGINES).map(eng => {
              const sel = engineId === eng.id;
              return (
                <button key={eng.id} type="button" onClick={() => setEngineId(eng.id)}
                  style={{
                    padding: '14px 10px', borderRadius: 8, cursor: 'pointer',
                    border: sel ? `2px solid ${eng.accent}` : '1.5px solid #ddd',
                    background: sel ? eng.bg : '#fff',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    fontFamily: 'inherit',
                    boxShadow: sel ? `0 4px 12px ${eng.accent}25` : 'none',
                  }}>
                  <div style={{ height: 36, display: 'flex', alignItems: 'center' }}>
                    {React.createElement(LOGOS[eng.id], { size: eng.id === 'gaggle' ? 22 : eng.id === 'yowzer' ? 22 : 18 })}
                  </div>
                  <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: '.06em' }}>{eng.personality}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 10 }}>
            Cursor style
          </label>
          <div className="home-cursor-row" style={{ display: 'flex', gap: 8 }}>
            {[
              { id: 'classic', label: 'Classic arrow' },
              { id: 'hand', label: 'Cartoon hand' },
              { id: 'system', label: 'Invisible (use system)' },
            ].map(opt => {
              const sel = cursorStyle === opt.id;
              return (
                <button key={opt.id} type="button" onClick={() => setCursorStyle(opt.id)}
                  style={{
                    flex: 1, padding: '10px 12px', borderRadius: 6, cursor: 'pointer',
                    border: sel ? '2px solid #1a1a1a' : '1.5px solid #ddd',
                    background: sel ? '#1a1a1a' : '#fff', color: sel ? '#fff' : '#1a1a1a',
                    fontSize: 13, fontFamily: 'inherit', fontWeight: 500,
                  }}>{opt.label}</button>
              );
            })}
          </div>
        </div>

        <button type="submit" disabled={!topic.trim() || lookingUp} style={{
          padding: '16px 24px', fontSize: 16, fontFamily: 'inherit', fontWeight: 600,
          background: topic.trim() && !lookingUp ? '#1a1a1a' : '#bbb', color: '#fff',
          border: 0, borderRadius: 8, cursor: topic.trim() && !lookingUp ? 'pointer' : 'not-allowed',
        }}>
          {lookingUp ? 'Looking up ID…' : 'Search like a fool →'}
        </button>
      </form>

      <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'ui-monospace, Menlo, monospace', textAlign: 'center', maxWidth: 540 }}>
        Parody. No affiliation with any real search engine. All results invented for comedy.
      </div>
    </div>
  );
}

// ─── Search runner (handles delay + typing + click + results) ────────
function SearchRun({ run, tweaks, onAdClick, onComplete, onExit }) {
  // run: { topic, engineId, cursorStyle, results?, id?, replay? }
  const { topic, engineId, cursorStyle } = run;
  const SERP = SERP_RENDERERS[engineId];
  const searchBtnRef = useRef(null);
  const [typed, setTyped] = useState('');
  const [status, setStatus] = useState('waiting'); // waiting → typing → clicking → loading → done
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorClicking, setCursorClicking] = useState(false);
  const [results, setResults] = useState([]);
  const [sidebarAds, setSidebarAds] = useState(run.cachedSidebarAds || null);
  const [hideCursor, setHideCursor] = useState(true);
  const lastPosRef = useRef({ x: -100, y: -100 });

  // Keep lastPosRef synced so wander can start from the last scripted position
  useEffect(() => { lastPosRef.current = cursorPos; }, [cursorPos]);

  // Build target list for wander — once results are in, pick up links + ads
  const getTargetCenters = useCallback(() => {
    const nodes = Array.from(document.querySelectorAll('[data-wander-target]'));
    if (!nodes.length) return null;
    return nodes
      .map(n => {
        const r = n.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return null;
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height };
      })
      .filter(Boolean);
  }, []);

  // Activate wander only after results are shown
  useCursorWander({
    active: status === 'done' && cursorStyle !== 'system',
    getTargetCenters,
    params: tweaks,
    setPos: setCursorPos,
    lastPosRef,
  });

  // start results fetch ASAP (parallel with the typing animation for snappier feel)
  const resultsPromiseRef = useRef(null);
  useEffect(() => {
    if (run.cachedResults) {
      resultsPromiseRef.current = Promise.resolve(run.cachedResults);
    } else {
      resultsPromiseRef.current = generateResults(topic, engineId, 6);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const seq = async () => {
      // initial pre-search delay (sit on empty SERP)
      await sleep(tweaks.preSearchDelayMs);
      if (cancelled) return;
      // cursor enters from off-screen, drift toward search bar (over the typed area)
      setHideCursor(false);
      const inputEl = document.querySelector('[data-cursor-target="search"]');
      if (inputEl) {
        const rect = inputEl.getBoundingClientRect();
        // start far away
        setCursorPos({ x: window.innerWidth - 80, y: window.innerHeight - 120 });
        await sleep(60);
        // approach the search input area (slightly left of button)
        setCursorPos({ x: rect.left - 220, y: rect.top + rect.height / 2 });
        await sleep(950);
      }
      if (cancelled) return;
      // type
      setStatus('typing');
      for (let i = 0; i < topic.length; i++) {
        if (cancelled) return;
        setTyped(topic.slice(0, i + 1));
        await sleep(tweaks.typingSpeedMs);
      }
      await sleep(280);
      if (cancelled) return;
      // move cursor to button
      setStatus('clicking');
      const btnEl = document.querySelector('[data-cursor-target="search"]');
      if (btnEl) {
        const r = btnEl.getBoundingClientRect();
        setCursorPos({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
        await sleep(720);
      }
      if (cancelled) return;
      // click animation
      setCursorClicking(true);
      const r2 = btnEl?.getBoundingClientRect();
      if (r2) spawnRipple(r2.left + r2.width / 2, r2.top + r2.height / 2);
      await sleep(160);
      setCursorClicking(false);
      if (cancelled) return;
      // show loading state, await results
      setStatus('loading');
      const got = await resultsPromiseRef.current;
      if (cancelled) return;
      setResults(got);
      // Pick sidebar ads (3 unique categories) once and persist them with the run
      let sideAds = run.cachedSidebarAds;
      if (!sideAds) {
        sideAds = [];
        const seen = new Set();
        for (let i = 0; i < 3 && seen.size < AD_KEYS.length; i++) {
          let pick;
          do { pick = pickAd(Math.random()); } while (seen.has(pick.category));
          seen.add(pick.category);
          sideAds.push(pick);
        }
      }
      setSidebarAds(sideAds);
      setStatus('done');
      // wander engine now takes over from here
      // save run if not a replay
      if (!run.replay) {
        const id = makeId();
        saveRun(id, { topic, engineId, results: got, sidebarAds: sideAds, savedAt: Date.now() });
        onComplete?.(id);
      }
    };
    seq();
    return () => { cancelled = true; };
  }, []);

  // Once results are visible, any click anywhere on the SERP exits.
  // Ad clicks are caught first (own handler), but they end up triggering the same exit.
  const handleSerpClick = (e) => {
    if (status !== 'done') return;
    // Let the Tweaks panel keep working
    if (e.target.closest('.twk-panel')) return;
    // Ad clicks bubble here too — that's fine, same outcome.
    onExit({ source: 'screen' });
  };

  return (
    <>
      <div onClick={handleSerpClick}
        style={{ cursor: status === 'done' ? 'pointer' : 'default' }}>
        <SERP
          query={typed}
          results={results}
          sidebarAds={sidebarAds}
          status={status === 'loading' ? 'loading' : 'done'}
          onAdClick={onAdClick}
          searchBtnRef={searchBtnRef}
          showAds={tweaks.adsEnabled}
        />
      </div>
      <FakeCursor pos={cursorPos} clicking={cursorClicking} hidden={hideCursor} style={cursorStyle} transition={status !== 'done'} />
      {status === 'done' && (
        <div style={{
          position: 'fixed', bottom: 14, right: 14, zIndex: 100,
          background: 'rgba(0,0,0,.72)', color: '#fff', padding: '7px 12px',
          borderRadius: 6, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11,
          letterSpacing: '.04em', pointerEvents: 'none',
        }}>
          click anywhere to continue →
        </div>
      )}
    </>
  );
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ─── Share dock ──────────────────────────────────────────────────────
function ShareDock({ id }) {
  const url = window.location.origin + window.location.pathname + '#id=' + id;
  const [copied, setCopied] = useState(false);
  const text = `I just searched "Not-Google". Replay it: ${id}`;
  const encUrl = encodeURIComponent(url);
  const encText = encodeURIComponent(text);

  const shares = [
    { id: 'x', label: 'X / Twitter', href: `https://twitter.com/intent/tweet?url=${encUrl}&text=${encText}`,
      icon: (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>) },
    { id: 'fb', label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
      icon: (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/></svg>) },
    { id: 'rd', label: 'Reddit', href: `https://reddit.com/submit?url=${encUrl}&title=${encText}`,
      icon: (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0a12 12 0 1 0 0 24 12 12 0 0 0 0-24zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>) },
    { id: 'wa', label: 'WhatsApp', href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      icon: (<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>) },
    { id: 'em', label: 'Email', href: `mailto:?subject=${encodeURIComponent('NotGoogleSearch replay')}&body=${encodeURIComponent(text + '\n\n' + url)}`,
      icon: (<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 6 10-6"/></svg>) },
  ];

  return (
    <div className="share-dock">
      <div className="share-dock-id">
        <span style={{ opacity: .55 }}>ID</span>
        <b>{id}</b>
      </div>
      <div className="share-dock-url">
        <input readOnly value={url} onFocus={e => e.target.select()} aria-label="Share link" />
        <button title="Copy link" onClick={async () => {
          try { await navigator.clipboard?.writeText(url); } catch {}
          setCopied(true); setTimeout(() => setCopied(false), 1400);
        }}>
          {copied ? (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          )}
        </button>
      </div>
      <div className="share-dock-icons">
        {shares.map(s => (
          <a key={s.id} href={s.href} target="_blank" rel="noopener noreferrer" title={s.label}
             onClick={e => e.stopPropagation()}>{s.icon}</a>
        ))}
      </div>
    </div>
  );
}

// ─── Root App ────────────────────────────────────────────────────────
function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [view, setView] = useState('home'); // 'home' | 'search'
  const [run, setRun] = useState(null);
  const [prefillTopic, setPrefillTopic] = useState('');
  const [fading, setFading] = useState(false);
  const [currentId, setCurrentId] = useState(null);

  // hash routing: #id=ABC12345
  useEffect(() => {
    let cancelled = false;
    const apply = async () => {
      const m = window.location.hash.match(/#id=([A-Za-z0-9]{8})/);
      if (m) {
        const saved = await loadRunAsync(m[1]);
        if (cancelled) return;
        if (saved) {
          setRun({
            topic: saved.topic,
            engineId: saved.engineId,
            cursorStyle: 'classic',
            cachedResults: saved.results,
            cachedSidebarAds: saved.sidebarAds,
            replay: true,
            launchKey: 'R' + m[1].toUpperCase() + ':' + Date.now(),
          });
          setCurrentId(m[1].toUpperCase());
          setView('search');
          return;
        }
      }
      setView('home');
    };
    apply();
    window.addEventListener('hashchange', apply);
    return () => { cancelled = true; window.removeEventListener('hashchange', apply); };
  }, []);

  const handleLaunch = (cfg) => {
    setRun({ ...cfg, launchKey: 'L' + Date.now() + Math.random().toString(36).slice(2, 7) });
    setCurrentId(null);
    setView('search');
  };

  const handleComplete = (id) => {
    setCurrentId(id);
    // update URL hash silently so user can share/replay
    history.replaceState(null, '', '#id=' + id);
  };

  const handleExit = (info) => {
    if (fading) return;
    setFading(true);
    setTimeout(() => {
      setPrefillTopic(run?.topic || '');
      history.replaceState(null, '', window.location.pathname);
      setView('home');
      setRun(null);
      setCurrentId(null);
      setFading(false);
    }, tweaks.fadeOutMs);
  };

  const handleAdClick = (ad) => handleExit({ source: 'ad', ad });

  return (
    <>
      {view === 'home' && (
        <HomeScreen
          key={prefillTopic + '-key'}
          initialTopic={prefillTopic}
          onLaunch={handleLaunch}
        />
      )}
      {view === 'search' && run && (
        <SearchRun
          key={run.launchKey}
          run={run}
          tweaks={tweaks}
          onAdClick={handleAdClick}
          onExit={handleExit}
          onComplete={handleComplete}
        />
      )}

      {/* ID + Share dock */}
      {view === 'search' && currentId && !fading && (
        <ShareDock id={currentId} />
      )}

      {/* Fade overlay */}
      <div className={`fade-overlay ${fading ? 'on' : ''}`} style={{ '--fade-dur': (tweaks.fadeOutMs / 1000) + 's' }} />

      <TweaksPanel>
        <TweakSection label="Timing" />
        <TweakSlider label="Typing speed" value={tweaks.typingSpeedMs} min={20} max={200} step={10} unit="ms/char"
          onChange={(v) => setTweak('typingSpeedMs', v)} />
        <TweakSlider label="Delay before search" value={tweaks.preSearchDelayMs} min={500} max={6000} step={250} unit="ms"
          onChange={(v) => setTweak('preSearchDelayMs', v)} />
        <TweakSlider label="Fade-out duration" value={tweaks.fadeOutMs} min={500} max={6000} step={250} unit="ms"
          onChange={(v) => setTweak('fadeOutMs', v)} />
        <TweakSection label="Display" />
        <TweakToggle label="Show ads" value={tweaks.adsEnabled}
          onChange={(v) => setTweak('adsEnabled', v)} />
        <TweakSection label="Cursor wander" />
        <TweakSlider label="Sweep duration" value={tweaks.wanderSweepMs} min={400} max={4000} step={100} unit="ms"
          onChange={(v) => setTweak('wanderSweepMs', v)} />
        <TweakSlider label="Hover linger" value={tweaks.wanderHoverMs} min={500} max={6000} step={100} unit="ms"
          onChange={(v) => setTweak('wanderHoverMs', v)} />
        <TweakSlider label="Jitter radius" value={tweaks.wanderJitterPx} min={0} max={60} step={1} unit="px"
          onChange={(v) => setTweak('wanderJitterPx', v)} />
        <TweakSlider label="Path curviness" value={tweaks.wanderCurviness} min={0} max={1.2} step={0.05}
          onChange={(v) => setTweak('wanderCurviness', v)} />
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
