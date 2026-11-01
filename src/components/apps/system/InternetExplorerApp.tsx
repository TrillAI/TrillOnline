import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOS, INSTALLABLE_CATALOG } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import { idbGet, persistHybrid, loadLocalFast } from '../../../services/persistentStorage';
import { ArenaAgentApp } from '../arena/ArenaAgentApp';
import { WindowsUpdateApp } from './WindowsUpdateApp';
import { WindowsXPFlagSVG } from '../aol/AOLGraphics';

interface InternetExplorerProps {
  windowId?: string;
  payload?: Record<string, unknown>;
}

interface IETab {
  id: string;
  title: string;
  url: string;
  history: string[];
  historyIndex: number;
  forceReader?: boolean;
}

interface IEFavorite {
  id: string;
  title: string;
  url: string;
}

interface IEHistoryItem {
  url: string;
  title: string;
  visitedAt: string;
}

interface SearchResultItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

interface PersistedIEState {
  tabs: IETab[];
  activeTabId: string;
  homeUrl: string;
  favorites: IEFavorite[];
  historyLog: IEHistoryItem[];
}

const DEFAULT_FAVORITES: IEFavorite[] = [
  { id: 'fav-arena', title: 'Arena.ai Agent', url: 'https://arena.ai/agent' },
  { id: 'fav-google', title: 'Google Search', url: 'http://www.google.com' },
  { id: 'fav-wiki', title: 'Wikipedia Encyclopedia', url: 'https://en.m.wikipedia.org/wiki/Windows_XP' },
  { id: 'fav-hn', title: 'Hacker News (Live)', url: 'https://news.ycombinator.com' },
  { id: 'fav-winup', title: 'Windows Update', url: 'http://windowsupdate.microsoft.com' },
  { id: 'fav-slingo', title: 'Slingo.com Classic', url: 'http://www.slingo.com' },
  { id: 'fav-softpedia', title: 'Softpedia .EXE Hub', url: 'http://www.softpedia.com/windows-xp-downloads' },
];

const INITIAL_TAB: IETab = {
  id: 'tab-1',
  title: 'Google - Microsoft Internet Explorer',
  url: 'http://www.google.com',
  history: ['http://www.google.com'],
  historyIndex: 0,
};

// Domains known to send X-Frame-Options: DENY / SAMEORIGIN where Turbo Reader gives an instant clean render
const FRAME_BLOCKED_DOMAINS = [
  'news.ycombinator.com',
  'github.com',
  'reddit.com',
  'nytimes.com',
  'cnn.com',
  'bbc.com',
  'x.com',
  'twitter.com',
  'stackoverflow.com',
  'medium.com',
];

function shouldDefaultToReader(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return FRAME_BLOCKED_DOMAINS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

function inferTitleFromUrl(url: string): string {
  if (url.includes('arena.ai/agent') || url.includes('arena.ai')) return 'Arena.ai Agent Mode';
  if (url.includes('windowsupdate.microsoft.com')) return 'Microsoft Windows Update';
  if (url.includes('softpedia.com')) return 'Softpedia XP Freeware';
  if (url.includes('slingo.com')) return 'Slingo.com Official';
  if (url.startsWith('http://www.google.com/search')) {
    const q = new URL(url).searchParams.get('q') || 'Search';
    return `${q} - Google Search`;
  }
  if (url === 'http://www.google.com' || url === 'https://www.google.com') return 'Google';
  if (url.startsWith('vfs://')) return 'Local XP Web App';
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url.slice(0, 28);
  }
}

export const InternetExplorerApp: React.FC<InternetExplorerProps> = ({ windowId, payload }) => {
  const {
    vfs,
    createFile,
    openApp,
    launchInstallerWizard,
    installedPackages,
    updateWindowTitle,
    pushBalloon,
  } = useOS();
  const { playSound } = useSound();

  const initialPersisted = loadLocalFast<PersistedIEState>('xp_ie6_state_v2', {
    tabs: [INITIAL_TAB],
    activeTabId: INITIAL_TAB.id,
    homeUrl: 'http://www.google.com',
    favorites: DEFAULT_FAVORITES,
    historyLog: [],
  });

  const [tabs, setTabs] = useState<IETab[]>(initialPersisted.tabs.length ? initialPersisted.tabs : [INITIAL_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>(initialPersisted.activeTabId || INITIAL_TAB.id);
  const [homeUrl, setHomeUrl] = useState<string>(initialPersisted.homeUrl || 'http://www.google.com');
  const [favorites, setFavorites] = useState<IEFavorite[]>(
    initialPersisted.favorites.length ? initialPersisted.favorites : DEFAULT_FAVORITES
  );
  const [historyLog, setHistoryLog] = useState<IEHistoryItem[]>(initialPersisted.historyLog || []);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [addressInput, setAddressInput] = useState<string>(activeTab?.url || 'http://www.google.com');

  const [sidePane, setSidePane] = useState<'none' | 'search' | 'favorites' | 'history' | 'copilot'>('none');
  const [openMenu, setOpenMenu] = useState<'file' | 'favorites' | 'tools' | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusText, setStatusText] = useState<string>('Done');

  // Search state
  const [googleInput, setGoogleInput] = useState<string>('');
  const [companionQuery, setCompanionQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState<boolean>(false);

  // Turbo Reader content cache
  const [readerHtml, setReaderHtml] = useState<{ title: string; markdown: string; hnItems?: { title: string; url: string; points: number; author: string }[] } | null>(null);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(0);

  const hydratedRef = useRef(false);
  const handledPayloadUrlRef = useRef<string | null>(null);

  // Hydrate persistent IE6 state from IndexedDB
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await idbGet<PersistedIEState>('xp_ie6_state_v2');
      if (mounted && saved && saved.tabs?.length) {
        setTabs(saved.tabs);
        setActiveTabId(saved.activeTabId || saved.tabs[0].id);
        setHomeUrl(saved.homeUrl || 'http://www.google.com');
        setFavorites(saved.favorites?.length ? saved.favorites : DEFAULT_FAVORITES);
        setHistoryLog(saved.historyLog || []);
      }
      hydratedRef.current = true;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Persist IE6 state on change
  useEffect(() => {
    if (!hydratedRef.current) return;
    persistHybrid<PersistedIEState>('xp_ie6_state_v2', {
      tabs,
      activeTabId,
      homeUrl,
      favorites,
      historyLog: historyLog.slice(0, 80),
    });
  }, [tabs, activeTabId, homeUrl, favorites, historyLog]);

  // Keep address bar & XP Window Title synced with activeTab
  useEffect(() => {
    if (!activeTab) return;
    setAddressInput(activeTab.url);
    if (windowId) {
      updateWindowTitle(windowId, `${activeTab.title} - Microsoft Internet Explorer`);
    }
  }, [activeTab, windowId, updateWindowTitle]);

  const normalizeInputToUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return homeUrl;
    if (trimmed.startsWith('vfs://')) return trimmed;
    const lower = trimmed.toLowerCase();
    if (lower === 'arena' || lower === 'arena.ai' || lower === 'arena.ai/agent') {
      return 'https://arena.ai/agent';
    }
    if (lower === 'windowsupdate' || lower === 'windows update') {
      return 'http://windowsupdate.microsoft.com';
    }
    if (lower === 'slingo' || lower === 'slingo.com') {
      return 'http://www.slingo.com';
    }
    if (lower === 'softpedia') {
      return 'http://www.softpedia.com/windows-xp-downloads';
    }
    // Check if it looks like a URL vs a search query
    const hasSpace = /\s/.test(trimmed);
    const hasDot = /\.[a-z]{2,}/i.test(trimmed);
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      // Rewrite desktop wikipedia to mobile wikipedia for super-clean fast framing
      return trimmed.replace('://en.wikipedia.org/', '://en.m.wikipedia.org/');
    }
    if (!hasSpace && hasDot) {
      const full = `https://${trimmed}`;
      return full.replace('://en.wikipedia.org/', '://en.m.wikipedia.org/');
    }
    return `http://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  };

  const navigateTab = useCallback(
    (rawTarget: string, opts?: { newTab?: boolean; forceReader?: boolean }) => {
      const url = normalizeInputToUrl(rawTarget);
      const title = inferTitleFromUrl(url);
      const useReader = opts?.forceReader ?? shouldDefaultToReader(url);

      setLoading(true);
      setStatusText(`Opening page ${url}...`);
      window.setTimeout(() => {
        setLoading(false);
        setStatusText('Done');
      }, 450);

      setHistoryLog((prev) => [
        { url, title, visitedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
        ...prev.filter((h) => h.url !== url),
      ]);

      if (opts?.newTab) {
        const newId = `tab-${Date.now()}`;
        const created: IETab = {
          id: newId,
          title,
          url,
          history: [url],
          historyIndex: 0,
          forceReader: useReader,
        };
        setTabs((prev) => [...prev, created]);
        setActiveTabId(newId);
      } else {
        setTabs((prev) =>
          prev.map((t) => {
            if (t.id !== activeTab.id) return t;
            const nextHist = [...t.history.slice(0, t.historyIndex + 1), url];
            return {
              ...t,
              title,
              url,
              history: nextHist,
              historyIndex: nextHist.length - 1,
              forceReader: useReader,
            };
          })
        );
      }
      setOpenMenu(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTab?.id, homeUrl]
  );

  // Open payload.url if passed from Arena AI / Explorer / Run dialog
  useEffect(() => {
    const targetUrl = payload?.url as string | undefined;
    if (targetUrl && handledPayloadUrlRef.current !== targetUrl) {
      handledPayloadUrlRef.current = targetUrl;
      navigateTab(targetUrl, { newTab: false });
    }
  }, [payload?.url, navigateTab]);

  // Execute fast parallel live web search whenever activeTab is a Google search URL
  useEffect(() => {
    if (!activeTab?.url.startsWith('http://www.google.com/search')) return;
    const q = new URL(activeTab.url).searchParams.get('q') || '';
    setGoogleInput(q);
    if (!q.trim()) return;

    let cancelled = false;
    setSearching(true);
    (async () => {
      const combined: SearchResultItem[] = [];

      // Built-in OS & Arena AI instant results when relevant
      if (/arena|agent|ai|image|video/i.test(q)) {
        combined.push({
          title: 'Arena.ai Agent Mode — Autonomous Coding, Image & Video Studio',
          url: 'https://arena.ai/agent',
          snippet:
            'Run multi-step coding tasks, generate HD PNG images and 30fps WebM videos, and save directly into Windows XP Persistent Storage.',
          source: 'arena.ai',
        });
      }
      if (/slingo|slot|bingo|game/i.test(q)) {
        combined.push({
          title: 'Slingo.com — Official Classic AOL Slingo Deluxe Portal',
          url: 'http://www.slingo.com',
          snippet:
            'Play Classic AOL 20-Spin Slingo Deluxe! Match numbers, Jokers, Gold Coins, and watch the Cherub rescue your score from the Devil.',
          source: 'slingo.com',
        });
      }

      try {
        const [wikiRes, hnRes] = await Promise.allSettled([
          fetch(
            `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
              q
            )}&utf8=&format=json&origin=*&srlimit=6`
          ).then((r) => r.json()),
          fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&hitsPerPage=5`).then((r) =>
            r.json()
          ),
        ]);

        if (wikiRes.status === 'fulfilled' && wikiRes.value?.query?.search) {
          for (const item of wikiRes.value.query.search) {
            const cleanSnippet = String(item.snippet || '').replace(/<[^>]+>/g, '');
            combined.push({
              title: `${item.title} — Wikipedia`,
              url: `https://en.m.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
              snippet: cleanSnippet,
              source: 'en.wikipedia.org',
            });
          }
        }

        if (hnRes.status === 'fulfilled' && hnRes.value?.hits) {
          for (const hit of hnRes.value.hits) {
            if (!hit.title) continue;
            combined.push({
              title: hit.title,
              url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
              snippet: `Discussed on Hacker News (${hit.points || 0} points, ${hit.num_comments || 0} comments by ${
                hit.author || 'user'
              })`,
              source: hit.url ? new URL(hit.url).hostname : 'news.ycombinator.com',
            });
          }
        }
      } catch {
        // Offline fallback gracefully keeps OS results
      }

      if (!cancelled) {
        setSearchResults(combined);
        setSearching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab?.url]);

  // Execute Turbo Reader fetch when activeTab.forceReader is true
  useEffect(() => {
    if (!activeTab?.forceReader) {
      setReaderHtml(null);
      setReaderError(null);
      return;
    }
    const targetUrl = activeTab.url;
    let cancelled = false;
    setLoading(true);
    setReaderError(null);

    (async () => {
      try {
        // Special ultra-fast native live feed for Hacker News frontpage
        if (targetUrl.includes('news.ycombinator.com') && !targetUrl.includes('item?id=')) {
          const res = await fetch('https://hn.algolia.com/api/v1/search?tags=front_page&hitsPerPage=20');
          const data = await res.json();
          if (!cancelled) {
            setReaderHtml({
              title: 'Hacker News — Live Front Page',
              markdown: '',
              hnItems: (data.hits || []).map((h: Record<string, unknown>) => ({
                title: String(h.title || 'Story'),
                url: String(h.url || `https://news.ycombinator.com/item?id=${h.objectID}`),
                points: Number(h.points || 0),
                author: String(h.author || 'hn'),
              })),
            });
            setLoading(false);
          }
          return;
        }

        // Check persistent page cache first for instant speed, then refresh in background
        const cacheKey = `ie6_reader_${targetUrl}`;
        const cached = await idbGet<{ title: string; markdown: string }>(cacheKey);
        if (cached && !cancelled) {
          setReaderHtml(cached);
          setLoading(false);
        }

        // Fetch clean live web page via Jina Reader CORS endpoint from user's browser
        const readerResp = await fetch(`https://r.jina.ai/${targetUrl}`, {
          headers: { Accept: 'text/plain' },
        });
        if (!readerResp.ok) throw new Error(`HTTP ${readerResp.status}`);
        const text = await readerResp.text();
        const payloadObj = { title: inferTitleFromUrl(targetUrl), markdown: text };
        persistHybrid(cacheKey, payloadObj);
        if (!cancelled) {
          setReaderHtml(payloadObj);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setReaderError(err instanceof Error ? err.message : 'Unable to load via Turbo Reader');
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeTab?.url, activeTab?.forceReader, iframeKey]);

  const goBack = () => {
    if (!activeTab || activeTab.historyIndex <= 0) return;
    const nextIdx = activeTab.historyIndex - 1;
    const nextUrl = activeTab.history[nextIdx];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              url: nextUrl,
              title: inferTitleFromUrl(nextUrl),
              historyIndex: nextIdx,
              forceReader: shouldDefaultToReader(nextUrl),
            }
          : t
      )
    );
  };

  const goForward = () => {
    if (!activeTab || activeTab.historyIndex >= activeTab.history.length - 1) return;
    const nextIdx = activeTab.historyIndex + 1;
    const nextUrl = activeTab.history[nextIdx];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTab.id
          ? {
              ...t,
              url: nextUrl,
              title: inferTitleFromUrl(nextUrl),
              historyIndex: nextIdx,
              forceReader: shouldDefaultToReader(nextUrl),
            }
          : t
      )
    );
  };

  const toggleReaderForActiveTab = () => {
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTab.id ? { ...t, forceReader: !t.forceReader } : t))
    );
  };

  const addCurrentToFavorites = () => {
    if (!activeTab) return;
    if (favorites.some((f) => f.url === activeTab.url)) return;
    setFavorites((prev) => [
      ...prev,
      { id: `fav-${Date.now()}`, title: activeTab.title.slice(0, 24), url: activeTab.url },
    ]);
    playSound('ding');
  };

  const saveCurrentPageToMyDocs = () => {
    if (!activeTab) return;
    const safeName = `${activeTab.title.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 28)}.html`;
    const body = readerHtml?.markdown
      ? `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeTab.title}</title></head><body style="font-family:Tahoma,sans-serif;padding:20px;line-height:1.6"><h2>${activeTab.title}</h2><p><small>Saved from ${activeTab.url}</small></p><pre style="white-space:pre-wrap;font-family:inherit">${readerHtml.markdown.replace(/</g, '&lt;')}</pre></body></html>`
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${activeTab.title}</title></head><body style="font-family:Tahoma,sans-serif;padding:20px"><h2>Saved Shortcut: ${activeTab.title}</h2><p><a href="${activeTab.url}">${activeTab.url}</a></p></body></html>`;
    createFile('saved-web', safeName, body, 'text/html', '/icons/luna48/file_html.png');
    playSound('ding');
    pushBalloon(
      'Web Page Saved to Persistent Storage',
      `Saved "${safeName}" into My Documents\\Saved Web Pages!`,
      '/icons/ie.png',
      'explorer'
    );
    setOpenMenu(null);
  };

  // Determine how to render the active tab's viewport
  const url = activeTab?.url || homeUrl;
  const isArenaSite = url.includes('arena.ai');
  const isWindowsUpdateSite = url.includes('windowsupdate.microsoft.com');
  const isSoftpediaSite = url.includes('softpedia.com');
  const isSlingoSite = url.includes('slingo.com');
  const isGoogleHome = url === 'http://www.google.com' || url === 'https://www.google.com';
  const isGoogleSearch = url.startsWith('http://www.google.com/search');
  const isVfsPage = url.startsWith('vfs://');
  const isExternalWeb =
    !isArenaSite &&
    !isWindowsUpdateSite &&
    !isSoftpediaSite &&
    !isSlingoSite &&
    !isGoogleHome &&
    !isGoogleSearch &&
    !isVfsPage;

  const vfsTargetNode = isVfsPage ? vfs.find((n) => n.id === url.replace('vfs://', '')) : undefined;

  return (
    <div
      onClick={() => setOpenMenu(null)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: '#ece9d8',
        fontSize: 11,
        minHeight: 0,
        userSelect: 'none',
      }}
    >
      {/* 1. Classic IE6 Menu Bar + Animated Windows Flag Throbber */}
      <div
        className="xp-menubar"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 0, height: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <span
            className="xp-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === 'file' ? null : 'file');
            }}
          >
            File
          </span>
          <span className="xp-menu-item" onClick={() => setSidePane((p) => (p === 'search' ? 'none' : 'search'))}>
            View
          </span>
          <span
            className="xp-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === 'favorites' ? null : 'favorites');
            }}
          >
            Favorites
          </span>
          <span
            className="xp-menu-item"
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenu(openMenu === 'tools' ? null : 'tools');
            }}
          >
            Tools
          </span>
          <span className="xp-menu-item" onClick={() => navigateTab('https://arena.ai/agent', { newTab: true })}>
            Arena AI
          </span>

          {/* Dropdown Menus */}
          {openMenu === 'file' && (
            <div
              className="xp-dropdown-menu"
              style={{ position: 'absolute', top: 22, left: 0, zIndex: 200, minWidth: 200 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="xp-dropdown-option" onClick={() => navigateTab(homeUrl, { newTab: true })}>
                New Tab
              </div>
              <div className="xp-dropdown-option" onClick={saveCurrentPageToMyDocs}>
                💾 Save Page to My Documents...
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  setHomeUrl(url);
                  setOpenMenu(null);
                  playSound('ding');
                }}
              >
                Set Current Page as Home Page
              </div>
            </div>
          )}

          {openMenu === 'favorites' && (
            <div
              className="xp-dropdown-menu"
              style={{ position: 'absolute', top: 22, left: 66, zIndex: 200, minWidth: 220 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="xp-dropdown-option"
                style={{ fontWeight: 700 }}
                onClick={() => {
                  addCurrentToFavorites();
                  setOpenMenu(null);
                }}
              >
                ⭐ Add Current Page to Favorites
              </div>
              <div className="xp-dropdown-sep" />
              {favorites.map((f) => (
                <div key={f.id} className="xp-dropdown-option" onClick={() => navigateTab(f.url)}>
                  🌐 {f.title}
                </div>
              ))}
            </div>
          )}

          {openMenu === 'tools' && (
            <div
              className="xp-dropdown-menu"
              style={{ position: 'absolute', top: 22, left: 120, zIndex: 200, minWidth: 215 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="xp-dropdown-option" onClick={() => navigateTab('http://windowsupdate.microsoft.com')}>
                🛡️ Windows Update
              </div>
              <div className="xp-dropdown-option" onClick={() => navigateTab('https://arena.ai/agent')}>
                ✨ Arena AI Agent Settings
              </div>
              <div className="xp-dropdown-sep" />
              <div
                className="xp-dropdown-option"
                onClick={() => {
                  setHistoryLog([]);
                  setOpenMenu(null);
                  playSound('recycle');
                }}
              >
                🧹 Clear Browsing History
              </div>
            </div>
          )}
        </div>

        {/* Classic IE6 Right-Corner Windows Throbber Box */}
        <div
          style={{
            width: 38,
            height: 24,
            background: '#ffffff',
            borderLeft: '1px solid #aca899',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title="Microsoft Internet Explorer 6"
        >
          <div style={{ transform: loading ? 'scale(1.12) rotate(6deg)' : 'none', transition: 'transform 0.2s' }}>
            <WindowsXPFlagSVG size={16} />
          </div>
        </div>
      </div>

      {/* 2. Classic IE6 Standard Buttons Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 3,
          padding: '3px 6px',
          borderBottom: '1px solid #d8d2bd',
          background: 'linear-gradient(180deg, #faf9f4 0%, #ece9d8 100%)',
          flexWrap: 'wrap',
        }}
      >
        <button
          className="xp-btn"
          style={{ padding: '2px 8px' }}
          disabled={!activeTab || activeTab.historyIndex <= 0}
          onClick={goBack}
          title="Back"
        >
          <img src="/icons/back.png" alt="" style={{ width: 18, height: 18 }} />
          <span>Back</span>
        </button>
        <button
          className="xp-btn"
          style={{ padding: '2px 7px' }}
          disabled={!activeTab || activeTab.historyIndex >= activeTab.history.length - 1}
          onClick={goForward}
          title="Forward"
        >
          <img src="/icons/luna16/nav_forward.png" alt="" style={{ width: 16, height: 16 }} />
        </button>
        <button
          className="xp-btn"
          style={{ padding: '2px 7px' }}
          onClick={() => setLoading(false)}
          title="Stop"
        >
          <img src="/icons/luna16/document_stop.png" alt="" style={{ width: 16, height: 16 }} />
        </button>
        <button
          className="xp-btn"
          style={{ padding: '2px 7px' }}
          onClick={() => setIframeKey((k) => k + 1)}
          title="Refresh"
        >
          <img src="/icons/luna16/document_refresh.png" alt="" style={{ width: 16, height: 16 }} />
        </button>
        <button
          className="xp-btn"
          style={{ padding: '2px 7px' }}
          onClick={() => navigateTab(homeUrl)}
          title="Home"
        >
          <img src="/icons/home.png" alt="" style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ width: 1, height: 20, background: '#aca899', margin: '0 3px' }} />

        <button
          className={`xp-btn ${sidePane === 'search' ? 'xp-btn-primary' : ''}`}
          style={{ padding: '2px 8px' }}
          onClick={() => setSidePane((p) => (p === 'search' ? 'none' : 'search'))}
        >
          <img src="/icons/299(32x32).png" alt="" style={{ width: 16, height: 16 }} />
          <span>Search</span>
        </button>
        <button
          className={`xp-btn ${sidePane === 'favorites' ? 'xp-btn-primary' : ''}`}
          style={{ padding: '2px 8px' }}
          onClick={() => setSidePane((p) => (p === 'favorites' ? 'none' : 'favorites'))}
        >
          <img src="/icons/luna16/fave.png" alt="" style={{ width: 16, height: 16 }} />
          <span>Favorites</span>
        </button>
        <button
          className={`xp-btn ${sidePane === 'history' ? 'xp-btn-primary' : ''}`}
          style={{ padding: '2px 7px' }}
          onClick={() => setSidePane((p) => (p === 'history' ? 'none' : 'history'))}
          title="History"
        >
          <img src="/icons/luna16/history.png" alt="" style={{ width: 16, height: 16 }} />
        </button>

        <div style={{ width: 1, height: 20, background: '#aca899', margin: '0 3px' }} />

        <button
          className="xp-btn"
          style={{ padding: '2px 8px' }}
          onClick={() => openApp('aol-mailbox')}
          title="Read Mail (Gmail via AOL)"
        >
          <img src="/icons/mail.png" alt="" style={{ width: 16, height: 16 }} />
          <span>Mail</span>
        </button>
        <button
          className={`xp-btn ${isArenaSite ? 'xp-btn-primary' : ''}`}
          style={{ padding: '2px 8px', fontWeight: 700 }}
          onClick={() => navigateTab('https://arena.ai/agent')}
          title="Open https://arena.ai/agent inside IE6"
        >
          <img src="/icons/arena-ai.svg" alt="" style={{ width: 16, height: 16 }} />
          <span>arena.ai/agent</span>
        </button>
      </div>

      {/* 3. Classic IE6 Address Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          navigateTab(addressInput);
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 8px',
          borderBottom: '1px solid #d8d2bd',
          background: '#ece9d8',
        }}
      >
        <span style={{ color: '#444', fontWeight: 600 }}>Address</span>
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            background: '#fff',
            border: '1px solid #7f9db9',
            paddingLeft: 5,
            height: 22,
          }}
        >
          <img src="/icons/896(16x16).png" alt="" style={{ width: 14, height: 14, marginRight: 5 }} />
          <input
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            placeholder="Type any URL (https://...) or search query..."
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 11,
              fontFamily: 'Tahoma, sans-serif',
              height: '100%',
            }}
          />
        </div>
        <button type="submit" className="xp-btn" style={{ padding: '2px 10px', minHeight: 22 }}>
          <img src="/icons/290.png" alt="" style={{ width: 14, height: 14 }} />
          <span>Go</span>
        </button>
        <button
          type="button"
          className="xp-btn"
          style={{ padding: '2px 7px', minHeight: 22 }}
          onClick={addCurrentToFavorites}
          title="Bookmark this page"
        >
          ⭐
        </button>
      </form>

      {/* 4. Links Bar + Persistent Multi-Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 6px',
          borderBottom: '1px solid #aca899',
          background: '#f3f1e6',
          gap: 8,
          overflowX: 'auto',
        }}
      >
        {/* Tab Strip */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 3, minWidth: 0 }}>
          {tabs.map((t) => {
            const active = t.id === activeTab.id;
            return (
              <div
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '3px 8px',
                  borderRadius: '4px 4px 0 0',
                  border: active ? '1px solid #003c74' : '1px solid #aca899',
                  background: active ? '#ffffff' : '#e2dfd3',
                  fontWeight: active ? 700 : 400,
                  cursor: 'pointer',
                  maxWidth: 165,
                }}
              >
                <img src="/icons/896(16x16).png" alt="" style={{ width: 12, height: 12, flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.title}
                </span>
                {tabs.length > 1 && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      const filtered = tabs.filter((x) => x.id !== t.id);
                      setTabs(filtered);
                      if (active) setActiveTabId(filtered[filtered.length - 1].id);
                    }}
                    style={{ marginLeft: 2, color: '#64748b', fontWeight: 700, padding: '0 2px' }}
                  >
                    ×
                  </span>
                )}
              </div>
            );
          })}
          <button
            className="xp-btn"
            style={{ padding: '1px 6px', minHeight: 20, fontWeight: 700 }}
            onClick={() => navigateTab(homeUrl, { newTab: true })}
            title="New Persistent Tab"
          >
            +
          </button>
        </div>

        {/* Quick Favorites Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          <span style={{ color: '#666', fontSize: 10 }}>Links »</span>
          {favorites.slice(0, 6).map((fav) => (
            <button
              key={fav.id}
              type="button"
              onClick={() => navigateTab(fav.url)}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 3,
                padding: '1px 5px',
                fontSize: 10.5,
                color: '#003399',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {fav.title}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Classic Pale-Yellow IE6 Information Bar for External Web Engine Control */}
      {isExternalWeb && (
        <div
          style={{
            background: '#ffffe1',
            borderBottom: '1px solid #aca899',
            padding: '3px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 10.5,
            color: '#1e293b',
            gap: 8,
          }}
        >
          <span>
            🛡️ <b>Internet Explorer 6 Smart Web Engine:</b>{' '}
            {activeTab.forceReader
              ? 'Rendering via ⚡ Turbo Web Reader (bypasses X-Frame-Options restrictions for fast reading).'
              : 'Rendering live Direct Frame. If a website refuses framing, switch to ⚡ Turbo Web Reader →'}
          </span>
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <button
              className="xp-btn"
              style={{ padding: '1px 8px', minHeight: 19, fontSize: 10 }}
              onClick={toggleReaderForActiveTab}
            >
              {activeTab.forceReader ? '🌐 Switch to Direct Frame' : '⚡ Switch to Turbo Reader'}
            </button>
            <button
              className="xp-btn"
              style={{ padding: '1px 8px', minHeight: 19, fontSize: 10 }}
              onClick={saveCurrentPageToMyDocs}
            >
              💾 Save to My Documents
            </button>
          </div>
        </div>
      )}

      {/* 6. Main Body: Optional Classic IE6 Left Pane + Browser Content Viewport */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>
        {sidePane !== 'none' && (
          <div
            style={{
              width: 220,
              borderRight: '2px solid #aca899',
              background: sidePane === 'search' ? '#d3e5fa' : '#f8f7f1',
              display: 'flex',
              flexDirection: 'column',
              padding: 8,
              overflowY: 'auto',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <b style={{ color: '#003399', fontSize: 12 }}>
                {sidePane === 'search'
                  ? '🐶 Search Companion'
                  : sidePane === 'favorites'
                  ? '⭐ Favorites'
                  : '🕒 History'}
              </b>
              <button
                className="xp-btn"
                style={{ padding: '0 5px', minHeight: 18, fontSize: 10 }}
                onClick={() => setSidePane('none')}
              >
                ✕
              </button>
            </div>

            {sidePane === 'search' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (companionQuery.trim()) {
                    navigateTab(`http://www.google.com/search?q=${encodeURIComponent(companionQuery.trim())}`);
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                <div style={{ background: '#ffffe1', border: '1px solid #94a3b8', borderRadius: 6, padding: 8 }}>
                  What do you want to search the Web for today?
                </div>
                <input
                  className="xp-input"
                  placeholder="Type keywords..."
                  value={companionQuery}
                  onChange={(e) => setCompanionQuery(e.target.value)}
                />
                <button type="submit" className="xp-btn xp-btn-primary">
                  🔍 Search the Web
                </button>
                <button
                  type="button"
                  className="xp-btn"
                  onClick={() => navigateTab('https://arena.ai/agent')}
                >
                  ✨ Ask Arena AI Agent Instead
                </button>
              </form>
            )}

            {sidePane === 'favorites' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button className="xp-btn" onClick={addCurrentToFavorites} style={{ marginBottom: 4 }}>
                  + Add Current Page
                </button>
                {favorites.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '4px 6px',
                      borderRadius: 3,
                      background: '#fff',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigateTab(f.url)}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      ⭐ {f.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {sidePane === 'history' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {historyLog.length === 0 ? (
                  <div style={{ color: '#64748b' }}>No history items yet.</div>
                ) : (
                  historyLog.map((h, i) => (
                    <div
                      key={i}
                      onClick={() => navigateTab(h.url)}
                      style={{
                        padding: '4px 6px',
                        borderRadius: 3,
                        background: '#fff',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {h.title}
                      </div>
                      <div style={{ fontSize: 9.5, color: '#64748b' }}>{h.visitedAt}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Main Browser Viewport */}
        <div style={{ flex: 1, background: '#ffffff', display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, overflowY: 'auto' }}>
          {/* A. https://arena.ai/agent inside Old IE6! */}
          {isArenaSite && <ArenaAgentApp embeddedInIE />}

          {/* B. http://windowsupdate.microsoft.com inside Old IE6! */}
          {isWindowsUpdateSite && <WindowsUpdateApp />}

          {/* C. Local Persistent VFS HTML App */}
          {isVfsPage && (
            vfsTargetNode?.content ? (
              <iframe
                key={iframeKey}
                title={vfsTargetNode.name}
                srcDoc={vfsTargetNode.content}
                style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <div style={{ padding: 24 }}>
                <h3>Cannot find file {url}</h3>
                <p>Check My Documents\Arena AI Projects or Saved Web Pages.</p>
              </div>
            )
          )}

          {/* D. Classic 2004 Google Home Page */}
          {isGoogleHome && (
            <div style={{ padding: '46px 20px', textAlign: 'center', fontFamily: 'Arial, sans-serif' }}>
              <div style={{ fontSize: 60, fontWeight: 700, fontFamily: 'Times New Roman, serif', letterSpacing: -2, marginBottom: 14 }}>
                <span style={{ color: '#1a56db' }}>G</span>
                <span style={{ color: '#dc2626' }}>o</span>
                <span style={{ color: '#eab308' }}>o</span>
                <span style={{ color: '#1a56db' }}>g</span>
                <span style={{ color: '#16a34a' }}>l</span>
                <span style={{ color: '#dc2626' }}>e</span>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateTab(`http://www.google.com/search?q=${encodeURIComponent(googleInput || 'Windows XP')}`);
                }}
              >
                <input
                  autoFocus
                  className="xp-input"
                  style={{ width: 390, maxWidth: '90%', height: 28, fontSize: 13, padding: '2px 8px' }}
                  placeholder="Search the live Web or enter any topic..."
                  value={googleInput}
                  onChange={(e) => setGoogleInput(e.target.value)}
                />
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 12 }}>
                  <button type="submit" className="xp-btn">
                    Google Search
                  </button>
                  <button
                    type="button"
                    className="xp-btn"
                    onClick={() => navigateTab('https://arena.ai/agent')}
                  >
                    ✨ I&apos;m Feeling Agentic (arena.ai/agent)
                  </button>
                </div>
              </form>

              {/* Quick Portal Directory */}
              <div
                style={{
                  maxWidth: 620,
                  margin: '32px auto 0',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: 8,
                  fontFamily: 'Tahoma, sans-serif',
                }}
              >
                {[
                  { label: '✨ Arena.ai Agent', url: 'https://arena.ai/agent' },
                  { label: '🎰 Slingo.com', url: 'http://www.slingo.com' },
                  { label: '📚 Wikipedia Live', url: 'https://en.m.wikipedia.org/wiki/Main_Page' },
                  { label: '📰 Hacker News Live', url: 'https://news.ycombinator.com' },
                  { label: '🛡️ Windows Update', url: 'http://windowsupdate.microsoft.com' },
                  { label: '💾 Softpedia .EXE', url: 'http://www.softpedia.com/windows-xp-downloads' },
                ].map((portal) => (
                  <div
                    key={portal.url}
                    onClick={() => navigateTab(portal.url)}
                    style={{
                      padding: '8px 10px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 5,
                      background: '#f8fafc',
                      color: '#1d4ed8',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {portal.label}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 28, fontSize: 11, color: '#64748b' }}>
                ©2004 Google — Fast Persistent Internet Explorer 6 Edition
              </div>
            </div>
          )}

          {/* E. Fast Live Parallel Google Search Results */}
          {isGoogleSearch && (
            <div style={{ padding: '14px 24px', fontFamily: 'Arial, sans-serif' }}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  navigateTab(`http://www.google.com/search?q=${encodeURIComponent(googleInput)}`);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  paddingBottom: 12,
                  borderBottom: '1px solid #bfdbfe',
                  marginBottom: 12,
                }}
              >
                <span
                  onClick={() => navigateTab('http://www.google.com')}
                  style={{ fontFamily: 'Times New Roman, serif', fontSize: 26, fontWeight: 700, cursor: 'pointer' }}
                >
                  <span style={{ color: '#1a56db' }}>G</span>
                  <span style={{ color: '#dc2626' }}>o</span>
                  <span style={{ color: '#eab308' }}>o</span>
                  <span style={{ color: '#1a56db' }}>g</span>
                  <span style={{ color: '#16a34a' }}>l</span>
                  <span style={{ color: '#dc2626' }}>e</span>
                </span>
                <input
                  className="xp-input"
                  style={{ width: 320, height: 25 }}
                  value={googleInput}
                  onChange={(e) => setGoogleInput(e.target.value)}
                />
                <button type="submit" className="xp-btn">
                  Search
                </button>
              </form>

              {searching ? (
                <div style={{ color: '#475569', padding: 12 }}>Searching the live Web...</div>
              ) : searchResults.length === 0 ? (
                <div style={{ padding: 12 }}>No results found. Try another query or visit a direct URL!</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 680 }}>
                  {searchResults.map((res, idx) => (
                    <div key={idx}>
                      <div
                        onClick={() => navigateTab(res.url)}
                        style={{
                          color: '#1a0dab',
                          fontSize: 15,
                          textDecoration: 'underline',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        {res.title}
                      </div>
                      <div style={{ fontSize: 12, color: '#1e293b', marginTop: 2, lineHeight: 1.45 }}>{res.snippet}</div>
                      <div style={{ fontSize: 11, color: '#00802a', marginTop: 2 }}>{res.url}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* F. Classic Slingo.com Official Web Portal */}
          {isSlingoSite && (
            <div
              style={{
                flex: 1,
                background: 'linear-gradient(180deg, #1e3a8a 0%, #091230 100%)',
                color: '#fff',
                padding: 28,
                textAlign: 'center',
              }}
            >
              <h1 style={{ color: '#fde047', margin: '0 0 8px', fontSize: 30 }}>
                🎰 Welcome to Official SLINGO.COM (AOL Games)
              </h1>
              <p style={{ maxWidth: 560, margin: '0 auto 18px', fontSize: 13, color: '#dbeafe', lineHeight: 1.5 }}>
                Half Slots, Half Bingo, 100% Classic Fun! Take 20 spins, line up 5-in-a-row Slingos, collect Gold Coins
                & Jokers, and watch the Cherub save your score from the Slingo Devil!
              </p>
              <button
                className="xp-btn xp-btn-primary"
                style={{ padding: '10px 26px', fontSize: 14, fontWeight: 900 }}
                onClick={() => openApp('slingo')}
              >
                ★ PLAY SLINGO DELUXE NOW ★
              </button>
            </div>
          )}

          {/* G. Softpedia .EXE Freeware Hub */}
          {isSoftpediaSite && (
            <div>
              <div
                style={{
                  background: 'linear-gradient(180deg, #003e85 0%, #002b60 100%)',
                  color: '#fff',
                  padding: '12px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: 22, fontWeight: 900 }}>SOFTPEDIA® — Windows XP Freeware Hub</span>
                <span>100% Clean Certified .EXE Downloads</span>
              </div>
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {INSTALLABLE_CATALOG.map((pkg) => {
                  const inst = installedPackages.some((p) => p.id === pkg.id);
                  return (
                    <div
                      key={pkg.id}
                      style={{
                        border: '1px solid #cbd5e1',
                        borderRadius: 5,
                        padding: 12,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <img src={pkg.icon} alt="" style={{ width: 36, height: 36 }} />
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>
                            {pkg.name} {pkg.version}
                          </div>
                          <div style={{ color: '#64748b', fontSize: 10 }}>
                            {pkg.installerFile} ({pkg.sizeMB} MB)
                          </div>
                        </div>
                      </div>
                      <div>{pkg.description}</div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        {inst ? (
                          <button className="xp-btn" onClick={() => openApp(pkg.appId)}>
                            ✓ Launch Installed App
                          </button>
                        ) : (
                          <button className="xp-btn xp-btn-primary" onClick={() => launchInstallerWizard(pkg)}>
                            ⬇ Download & Run Setup.exe
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* H. External Open Web: Either Turbo Web Reader OR Live Direct Iframe */}
          {isExternalWeb && (
            activeTab.forceReader ? (
              <div style={{ padding: '18px 26px', maxWidth: 820, margin: '0 auto', width: '100%', userSelect: 'text' }}>
                {readerHtml?.hnItems ? (
                  <div>
                    <div
                      style={{
                        background: '#ff6600',
                        color: '#000',
                        padding: '6px 10px',
                        fontWeight: 800,
                        fontSize: 13,
                        marginBottom: 10,
                      }}
                    >
                      Y | Hacker News (Live via IE6 Turbo Reader)
                    </div>
                    {readerHtml.hnItems.map((item, idx) => (
                      <div key={idx} style={{ padding: '6px 4px', borderBottom: '1px solid #f1f5f9' }}>
                        <div
                          onClick={() => navigateTab(item.url, { forceReader: true })}
                          style={{ color: '#0000cc', fontWeight: 600, fontSize: 12.5, cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {idx + 1}. {item.title}
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b' }}>
                          {item.points} points by {item.author} • {item.url}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : readerError ? (
                  <div style={{ padding: 20, border: '1px solid #cbd5e1', borderRadius: 6 }}>
                    <h3 style={{ marginTop: 0 }}>Turbo Reader Note</h3>
                    <p>{readerError}</p>
                    <button className="xp-btn xp-btn-primary" onClick={toggleReaderForActiveTab}>
                      Try Direct Frame Mode
                    </button>
                  </div>
                ) : !readerHtml ? (
                  <div style={{ padding: 20, color: '#475569' }}>⚡ Loading live web page via IE6 Turbo Reader...</div>
                ) : (
                  <div>
                    <h2 style={{ marginTop: 0, color: '#0f172a' }}>{readerHtml.title}</h2>
                    <div style={{ fontSize: 10.5, color: '#64748b', marginBottom: 14 }}>{url}</div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.65, fontSize: 12.5, color: '#1e293b' }}>
                      {readerHtml.markdown}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <iframe
                key={`${url}-${iframeKey}`}
                src={url}
                title="IE6 Web Viewport"
                onLoad={() => {
                  setLoading(false);
                  setStatusText('Done');
                }}
                style={{ flex: 1, width: '100%', height: '100%', border: 'none', minHeight: 360 }}
              />
            )
          )}
        </div>
      </div>

      {/* 7. Authentic IE6 Bottom Status Bar with Loading Meter & Security Zone */}
      <div
        style={{
          height: 22,
          borderTop: '1px solid #aca899',
          background: '#ece9d8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px',
          fontSize: 10.5,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>{loading ? `Opening page ${url.slice(0, 46)}...` : statusText}</span>
          {loading && (
            <div style={{ width: 90, height: 11, border: '1px inset #aca899', background: '#fff', padding: 1 }}>
              <div style={{ width: '70%', height: '100%', background: '#003399' }} />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#475569' }}>Persistent Storage: Synced</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <img src="/icons/luna16/zone_safe.png" alt="" style={{ width: 13, height: 13 }} />
            Internet
          </span>
        </div>
      </div>
    </div>
  );
};
