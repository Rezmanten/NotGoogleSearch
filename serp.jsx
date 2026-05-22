// serp.jsx — Search Engine Results Page chrome for each parody engine.
// Renders: top bar (logo + search bar showing current query + cursor target button),
// inline results+ads, sidebar ads. Each engine has distinct chrome.

const { useState: _useS, useEffect: _useE, useRef: _useR } = React;

// ── Ad copy bank (joke ads, returned by LLM but we also have fallbacks) ─
const AD_BANK = {
  divorce: [
    { headline: 'Schlocker, Schlocker & Pain LLC', sub: '"We make your ex cry. Free consultation."', cta: 'Lawyer up →' },
    { headline: 'Divorce in 17 Minutes', sub: 'Online! No paperwork! Probably legal!', cta: 'Untie the knot →' },
    { headline: 'Custody Battle Royale', sub: 'Winner takes the dog. And the kids. Mostly the dog.', cta: 'Fight now →' },
  ],
  injury: [
    { headline: 'Slipped? Tripped? Flipped?', sub: 'Call HURT-NOW. We get you cash. Sometimes.', cta: '1-800-OUCH-OW →' },
    { headline: 'The Yelling Attorney™', sub: '"I will SCREAM until they pay you."', cta: 'Get screamed for →' },
    { headline: 'Were you near a thing?', sub: 'You may be entitled to financial compensation.', cta: 'Find out →' },
  ],
  hair: [
    { headline: 'Hair So Real It Cries', sub: 'Patented HairGoo™ application. 4 of 5 scalps approve.', cta: 'Re-mane yourself →' },
    { headline: 'BALDNO™', sub: 'Stop being bald. Start being… less bald.', cta: 'Order BALDNO →' },
    { headline: 'Wig City Outlet', sub: 'Wholesale follicles. Buy 2, get a confusing 3rd.', cta: 'Shop wigs →' },
  ],
  funeral: [
    { headline: 'Pre-Plan Your Demise', sub: 'Lock in 2019 casket prices. Today.', cta: 'Pre-die →' },
    { headline: 'Eternal Rest Express', sub: 'Drive-thru cremation. Open till 9pm Tuesdays.', cta: 'Reserve urn →' },
    { headline: 'Goodbye, Forever Inc.', sub: '"You\'ll love it. (You won\'t know.)"', cta: 'Pre-arrange →' },
  ],
  anger: [
    { headline: 'STOP YELLING — A Course', sub: '6 weeks. We yell at you about it.', cta: 'Enroll calmly →' },
    { headline: 'Pillow Punching Academy', sub: 'Accredited by no one. Effective for some.', cta: 'Reserve pillow →' },
    { headline: 'Whisper Therapy LLC', sub: 'Forget meditation. Try just being quieter.', cta: 'Shhh →' },
  ],
  singles: [
    { headline: 'LonelyMingle™', sub: '2.4M people who are also doing this at 2am.', cta: 'Mingle now →' },
    { headline: 'Singles Near Your Wreckage', sub: '47 matches within 800ft of your last bad decision.', cta: 'Swipe sideways →' },
    { headline: 'Date a Stranger Tonight', sub: 'Probably fine. Tell a friend first.', cta: 'Match me →' },
  ],
  witness: [
    { headline: 'New Name, New Face, New You', sub: 'Federal program. (Unofficially. Don\'t ask.)', cta: 'Vanish →' },
    { headline: 'Identity Liquidators', sub: 'We sell yours. You buy a better one. Win-win.', cta: 'Relocate me →' },
    { headline: 'Move to Boise™', sub: 'They\'ll never look there. They never look there.', cta: 'Get a Boise →' },
  ],
  internetdumb: [
    { icon: '🌐', headline: 'Did the internet make you do something dumb?', sub: 'You\'re not alone. (You are very alone.) Settlements from $200.', cta: 'Reclaim dignity →' },
    { icon: '📉', headline: 'I Watched One Video And Now I Have Opinions™', sub: 'Recovery program for people who got "research" from the comments.', cta: 'Unlearn →' },
    { icon: '⚠️', headline: 'Was it a YouTube tutorial?', sub: 'Step 4 was wrong. Our lawyers know. They\'ve been waiting.', cta: 'File suit →' },
  ],
  blackmail: [
    { icon: '😳', headline: 'Shhh… We can keep your secret. For money.', sub: 'Discreet professionals. Venmo accepted. No questions, lots of answers.', cta: 'Wire funds →' },
    { icon: '📸', headline: 'That photo? Yeah, we have it.', sub: 'Reasonable monthly retainer keeps it off the family group chat.', cta: 'Subscribe quietly →' },
    { icon: '🤐', headline: 'Hush Co. — A Subsidiary of Trust Us', sub: '"Your secret is safe with our 14 underpaid interns."', cta: 'Buy silence →' },
  ],
  dogconfess: [
    { icon: '🐕', headline: 'Confess to your dog. Professionally.', sub: 'Licensed canine confessor will sit very still while you weep. $40/session.', cta: 'Book Pastor Biscuit →' },
    { icon: '🦴', headline: 'Bark-tholomew Therapy LLC', sub: 'He doesn\'t understand, but he\'s the only one still listening.', cta: 'Schedule a snuggle →' },
  ],
  forgetit: [
    { icon: '🧠', headline: 'Forget what you just saw.', sub: 'Patent-pending memory-blur lozenge. May also forget your address.', cta: 'Order ForgetMint™ →' },
    { icon: '🩹', headline: 'Brain Eraser, Now in Lavender', sub: '"It worked! What worked? Exactly." — verified user', cta: 'Wipe me →' },
    { icon: '⏪', headline: 'Rewind That, Please', sub: 'Hypnotists ready to convince you that didn\'t happen. (It did.)', cta: 'Un-see now →' },
  ],
  apology: [
    { icon: '✉️', headline: 'Apology Ghostwriters Inc.', sub: 'We craft heartfelt sorrys you don\'t mean. Same-day delivery.', cta: 'Outsource regret →' },
    { icon: '🥀', headline: '"I\'m Sorry" — Written by Strangers', sub: 'Three tiers: Mumble, Sincere, and Tearful with Florals.', cta: 'Hire empathy →' },
  ],
  rage: [
    { icon: '🔨', headline: 'Smash A Printer Today', sub: 'Rage Room Express — 30-min sessions, sledgehammer included.', cta: 'Reserve a smash →' },
    { icon: '💥', headline: 'BREAK STUFF (Legally)', sub: 'Catharsis-as-a-Service. Bring snacks. Bring rage.', cta: 'Book carnage →' },
    { icon: '🪑', headline: 'Old Furniture? We Yell At It.', sub: 'Therapeutic destruction with a certified yelling coach.', cta: 'Schedule rage →' },
  ],
};
const AD_KEYS = Object.keys(AD_BANK);

function pickAd(seed = Math.random(), keyOverride) {
  const key = keyOverride || AD_KEYS[Math.floor(seed * AD_KEYS.length)];
  const pool = AD_BANK[key];
  const item = pool[Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * pool.length) % pool.length];
  return { ...item, category: key };
}

// ── Sidebar ads block ─────────────────────────────────────────────────
function SidebarAds({ engine, onAdClick, count = 3, ads: cachedAds }) {
  const ads = React.useMemo(() => {
    if (cachedAds && cachedAds.length) return cachedAds;
    const out = [];
    const seenCats = new Set();
    for (let i = 0; i < count; i++) {
      let ad;
      do { ad = pickAd(Math.random()); } while (seenCats.has(ad.category) && seenCats.size < AD_KEYS.length);
      seenCats.add(ad.category);
      out.push(ad);
    }
    return out;
  }, [engine, count, cachedAds]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {ads.map((ad, i) => (
        <button key={i} onClick={() => onAdClick(ad)} data-wander-target
          style={{
            textAlign: 'left', border: '1px solid #ddd', background: '#fff',
            borderRadius: 10, padding: '12px 14px', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', gap: 6,
            fontFamily: 'inherit',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="ad-badge" style={{ background: '#FFE9A3', color: '#5a4408' }}>Ad</span>
            <span style={{ fontSize: 11, color: '#888' }}>{ad.category}.example</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            {ad.icon && (
              <div style={{
                flex: '0 0 auto', width: 40, height: 40, borderRadius: 6,
                background: '#f3f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, lineHeight: 1,
              }}>{ad.icon}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1a0dab', lineHeight: 1.25 }}>{ad.headline}</div>
              <div style={{ fontSize: 12.5, color: '#444', lineHeight: 1.4 }}>{ad.sub}</div>
              <div style={{ fontSize: 12, color: '#0a8043', fontWeight: 600 }}>{ad.cta}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ── A single organic result ───────────────────────────────────────────
function ResultItem({ r, engine, onAdClick }) {
  if (r.isAd) {
    const icon = r.icon || r.ad?.icon;
    return (
      <button onClick={() => onAdClick(r.ad || pickAd(Math.random()))} data-wander-target style={{
        textAlign: 'left', background: 'transparent', border: 0, padding: 0,
        cursor: 'pointer', fontFamily: 'inherit', display: 'flex', gap: 12, width: '100%',
        alignItems: 'flex-start',
      }}>
        {icon && (
          <div style={{
            flex: '0 0 auto', width: 48, height: 48, borderRadius: 6,
            background: '#f3f0e8', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, lineHeight: 1, marginTop: 2,
          }}>{icon}</div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="ad-badge" style={{ background: '#1a0dab', color: '#fff' }}>Sponsored</span>
            <span style={{ fontSize: 13, color: '#0e7a39' }}>{r.url}</span>
          </div>
          <div style={{ fontSize: 19, color: '#1a0dab', fontWeight: 500, lineHeight: 1.25 }}>{r.title}</div>
          <div style={{ fontSize: 14, color: '#4d4d4d', marginTop: 4, lineHeight: 1.45 }}>{r.snippet}</div>
        </div>
      </button>
    );
  }
  return (
    <div>
      <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 2 }}>{r.url}</div>
      <a href="#" onClick={(e) => e.preventDefault()} data-wander-target style={{
        fontSize: 20, color: '#1a0dab', textDecoration: 'none', fontWeight: 400, lineHeight: 1.25,
      }}>{r.title}</a>
      <div style={{ fontSize: 14, color: '#4d4d4d', marginTop: 4, lineHeight: 1.45 }}>{r.snippet}</div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
//  GAGGLE SERP
// ───────────────────────────────────────────────────────────────────────
function GaggleSERP({ query, results, sidebarAds, status, onAdClick, searchBtnRef, showAds }) {
  return (
    <div style={{ minHeight: '100vh', background: '#fff', color: ENGINES.gaggle.text, fontFamily: ENGINES.gaggle.fontStack }}>
      {/* Top bar */}
      <div className="serp-topbar" style={{ borderBottom: '1px solid #ebebeb', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 28 }}>
        <div style={{ transform: 'scale(.42)', transformOrigin: 'left center', marginRight: -100 }}>
          <GaggleLogo size={64} />
        </div>
        <div style={{ flex: 1, maxWidth: 690, display: 'flex', alignItems: 'center', gap: 10,
          border: '1px solid #dfe1e5', borderRadius: 24, padding: '8px 16px', boxShadow: '0 1px 6px rgba(32,33,36,.08)',
        }}>
          <span style={{ fontSize: 14, flex: 1, minHeight: 22 }}>{query}<span className="typed-caret" /></span>
          <button ref={searchBtnRef} data-cursor-target="search" style={{
            border: 0, background: 'transparent', cursor: 'pointer', padding: 4,
            fontSize: 18, color: ENGINES.gaggle.accent,
          }}>🔍</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 13, color: '#666' }}>
          <span>Settings</span><span>Account</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="serp-tabs" style={{ borderBottom: '1px solid #ebebeb', padding: '0 28px', display: 'flex', gap: 28, fontSize: 13, color: '#5f6368' }}>
        {['All', 'Smug', 'Smugger', 'Smuggest', 'Shopping', 'More'].map((t, i) => (
          <div key={t} style={{
            padding: '14px 0',
            color: i === 0 ? ENGINES.gaggle.accent : '#5f6368',
            borderBottom: i === 0 ? `3px solid ${ENGINES.gaggle.accent}` : '3px solid transparent',
          }}>{t}</div>
        ))}
      </div>

      {/* Body */}
      <div className="serp-body" style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: showAds ? '1fr 320px' : '1fr', gap: 48, maxWidth: 1280 }}>
        <div>
          {results.length > 0 && (
            <div style={{ fontSize: 13, color: '#5f6368', marginBottom: 8 }}>
              About 4,820,000,000 results (0.42 seconds — your time is worth nothing)
            </div>
          )}
          {results.length > 0 && (
            <div style={{ fontSize: 16, color: '#5f6368', marginBottom: 18, fontStyle: 'italic' }}>
              Showing results for <b style={{ color: '#c5221f' }}>{results[0]?.didYouMean || query}</b>.
              {' '}Search instead for <a href="#" onClick={e => e.preventDefault()} style={{ color: ENGINES.gaggle.accent }}>{query}</a>?
            </div>
          )}
          {status === 'loading' && <LoadingResults />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {results.map((r, i) => <ResultItem key={i} r={r} engine="gaggle" onAdClick={onAdClick} />)}
          </div>
        </div>
        {showAds && (
          <aside>
            <div style={{ fontSize: 11, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Ads · related to your suffering</div>
            <SidebarAds engine="gaggle" onAdClick={onAdClick} ads={sidebarAds} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
//  BYNG SERP
// ───────────────────────────────────────────────────────────────────────
function ByngSERP({ query, results, sidebarAds, status, onAdClick, searchBtnRef, showAds }) {
  return (
    <div style={{ minHeight: '100vh', background: ENGINES.byng.bg, color: ENGINES.byng.text, fontFamily: ENGINES.byng.fontStack }}>
      <div className="serp-topbar" style={{ background: '#fff', borderBottom: '1px solid #d8dde6', padding: '12px 32px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <ByngLogo size={28} />
        <div style={{ flex: 1, maxWidth: 740, display: 'flex', border: '1px solid #cfd6e1', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '10px 14px', fontSize: 15, minHeight: 40 }}>{query}<span className="typed-caret" /></div>
          <button ref={searchBtnRef} data-cursor-target="search" style={{
            border: 0, background: ENGINES.byng.accent, color: '#fff', padding: '0 22px',
            fontWeight: 600, cursor: 'pointer', fontSize: 14,
          }}>Search</button>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: ENGINES.byng.palette[1], fontWeight: 600, padding: '6px 10px', border: `1px solid ${ENGINES.byng.palette[1]}`, borderRadius: 3 }}>
          ⭐ 4,217 Microbland Pts
        </div>
      </div>

      <div className="serp-tabs" style={{ background: '#fff', borderBottom: '1px solid #d8dde6', padding: '0 32px', display: 'flex', gap: 22, fontSize: 13, color: '#3a3a3a' }}>
        {['ALL', 'IMAGES', 'VIDEOS', 'MAPS', 'NEWS', 'SHOPPING', 'WORK', 'MORE'].map((t, i) => (
          <div key={t} style={{
            padding: '12px 0', fontWeight: i === 0 ? 700 : 500,
            color: i === 0 ? ENGINES.byng.accent : '#3a3a3a',
            borderBottom: i === 0 ? `3px solid ${ENGINES.byng.accent}` : '3px solid transparent',
          }}>{t}</div>
        ))}
      </div>

      <div className="serp-body" style={{ padding: '22px 32px', display: 'grid', gridTemplateColumns: showAds ? '1fr 320px' : '1fr', gap: 40, maxWidth: 1320 }}>
        <div>
          {results.length > 0 && (
            <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
              {(results.length * 142_310).toLocaleString()} results · sponsored by valued partners
            </div>
          )}
          {status === 'loading' && <LoadingResults />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {results.map((r, i) => <ResultItem key={i} r={r} engine="byng" onAdClick={onAdClick} />)}
          </div>
        </div>
        {showAds && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: '#fff', border: '1px solid #d8dde6', padding: 12, fontSize: 12 }}>
              <div style={{ fontWeight: 700, color: ENGINES.byng.accent, marginBottom: 6 }}>Sponsored Solutions Hub™</div>
              <div style={{ color: '#666' }}>Synergistic results curated by our Trusted Partner Network.</div>
            </div>
            <SidebarAds engine="byng" onAdClick={onAdClick} ads={sidebarAds} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
//  YOWZER! SERP
// ───────────────────────────────────────────────────────────────────────
function YowzerSERP({ query, results, sidebarAds, status, onAdClick, searchBtnRef, showAds }) {
  const yowzerCount = React.useMemo(() => Math.floor(Math.random() * 9_000_000 + 1_000_000), [results.length > 0]);
  return (
    <div style={{ minHeight: '100vh', background: ENGINES.yowzer.bg, color: ENGINES.yowzer.text, fontFamily: 'Inter, sans-serif' }}>
      <div className="serp-topbar" style={{ background: '#fff', borderBottom: `3px solid ${ENGINES.yowzer.palette[0]}`, padding: '10px 28px', display: 'flex', alignItems: 'center', gap: 18 }}>
        <div style={{ transform: 'scale(.5)', transformOrigin: 'left center', marginRight: -70 }}>
          <YowzerLogo size={52} />
        </div>
        <div style={{ flex: 1, maxWidth: 720, display: 'flex', border: `2px solid ${ENGINES.yowzer.palette[0]}`, borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ flex: 1, padding: '10px 14px', fontSize: 15, background: '#fff', minHeight: 40 }}>{query}<span className="typed-caret" /></div>
          <button ref={searchBtnRef} data-cursor-target="search" style={{
            border: 0, background: ENGINES.yowzer.palette[1], color: '#fff', padding: '0 22px',
            fontWeight: 800, cursor: 'pointer', fontSize: 13, letterSpacing: '.04em',
          }}>SEARCH!</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, fontSize: 12, color: ENGINES.yowzer.palette[0], fontWeight: 700 }}>
          <span>📧 Mail (47,201)</span>
          <span>🔮 Horoscope</span>
          <span>📈 Stocks ↓</span>
        </div>
      </div>

      {/* yelling banner */}
      <div style={{ background: ENGINES.yowzer.palette[1], color: '#fff', padding: '6px 28px', fontSize: 12, fontWeight: 800, letterSpacing: '.04em', display: 'flex', justifyContent: 'space-between' }}>
        <span>🚨 BREAKING: A CELEBRITY DID SOMETHING. CLICK FOR PHOTOS WE DON'T HAVE.</span>
        <span>⛈ WEATHER: YES.</span>
      </div>

      <div className="serp-body" style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: showAds ? '1fr 300px' : '1fr', gap: 32, maxWidth: 1280 }}>
        <div>
          {results.length > 0 && (
            <div style={{ fontSize: 13, color: '#7a4ba5', marginBottom: 14, fontWeight: 600 }}>
              FOUND {yowzerCount.toLocaleString()} RESULTS! (probably)
            </div>
          )}
          {status === 'loading' && <LoadingResults />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {results.map((r, i) => <ResultItem key={i} r={r} engine="yowzer" onAdClick={onAdClick} />)}
          </div>
        </div>
        {showAds && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: ENGINES.yowzer.palette[2], padding: 12, borderRadius: 6, fontSize: 12, fontWeight: 700, color: '#5a3e00' }}>
              🎰 TODAY'S HOROSCOPE: STOP SEARCHING THIS.
            </div>
            <SidebarAds engine="yowzer" onAdClick={onAdClick} ads={sidebarAds} />
          </aside>
        )}
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────
//  DUCKDUCKGOOSE SERP
// ───────────────────────────────────────────────────────────────────────
function DDGooseSERP({ query, results, sidebarAds, status, onAdClick, searchBtnRef, showAds }) {
  return (
    <div style={{ minHeight: '100vh', background: ENGINES.ddgoose.bg, color: ENGINES.ddgoose.text, fontFamily: ENGINES.ddgoose.fontStack }}>
      <div className="serp-topbar" style={{ borderBottom: '1px solid #d9d0bd', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 24, background: 'rgba(255,255,255,.4)' }}>
        <div style={{ transform: 'scale(.55)', transformOrigin: 'left center', marginRight: -100 }}>
          <DDGooseLogo size={56} />
        </div>
        <div style={{ flex: 1, maxWidth: 720, display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1px solid #d9d0bd', borderRadius: 999, padding: '8px 18px',
        }}>
          <span style={{ fontSize: 14, flex: 1, minHeight: 24 }}>{query}<span className="typed-caret" /></span>
          <button ref={searchBtnRef} data-cursor-target="search" style={{
            border: 0, background: ENGINES.ddgoose.accent, color: '#fff', borderRadius: 999,
            padding: '6px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 13,
          }}>HONK</button>
        </div>
      </div>

      <div style={{ background: '#2c2c2c', color: '#FFD7A0', padding: '6px 28px', fontSize: 12, letterSpacing: '.04em', display: 'flex', justifyContent: 'space-between' }}>
        <span>🕵 NOTICE: Your search may already be logged elsewhere. Clear your cache. NOW.</span>
        <span>VPN: NOT DETECTED</span>
      </div>

      <div className="serp-body" style={{ padding: '22px 28px', display: 'grid', gridTemplateColumns: showAds ? '1fr 300px' : '1fr', gap: 40, maxWidth: 1280 }}>
        <div>
          {results.length > 0 && (
            <div style={{ fontSize: 13, color: '#5a4d36', marginBottom: 14, fontStyle: 'italic' }}>
              We didn't count the results. Counting leaves a trail.
            </div>
          )}
          {status === 'loading' && <LoadingResults />}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
            {results.map((r, i) => <ResultItem key={i} r={r} engine="ddgoose" onAdClick={onAdClick} />)}
          </div>
        </div>
        {showAds && (
          <aside style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#2c2c2c', color: '#FFD7A0', padding: 12, borderRadius: 6, fontSize: 12 }}>
              <b>⚠ Privacy reminder:</b> the ads below are real. Everything else is too.
            </div>
            <SidebarAds engine="ddgoose" onAdClick={onAdClick} ads={sidebarAds} />
          </aside>
        )}
      </div>
    </div>
  );
}

function LoadingResults() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {[0,1,2,3].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="shimmer" style={{ width: 180, height: 12 }} />
          <div className="shimmer" style={{ width: '70%', height: 18 }} />
          <div className="shimmer" style={{ width: '94%', height: 12 }} />
          <div className="shimmer" style={{ width: '84%', height: 12 }} />
        </div>
      ))}
    </div>
  );
}

const SERP_RENDERERS = {
  gaggle: GaggleSERP,
  byng: ByngSERP,
  yowzer: YowzerSERP,
  ddgoose: DDGooseSERP,
};

Object.assign(window, { SERP_RENDERERS, AD_BANK, AD_KEYS, pickAd, SidebarAds, ResultItem, LoadingResults });
