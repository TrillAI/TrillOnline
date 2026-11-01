import React, { useState } from 'react';
import { useOS } from '../../../context/OSContext';
import { useSound } from '../../../context/SoundContext';
import {
  GmailMessage,
  INITIAL_DEMO_GMAIL_MESSAGES,
  MailFolder,
  requestGoogleOAuthToken,
} from '../../../services/gmailService';
import { AOLMailboxIconSVG } from './AOLGraphics';

interface AOLMailboxProps {
  embedded?: boolean;
  initialTab?: 'mail' | 'write' | 'connect';
}

export const AOLMailbox: React.FC<AOLMailboxProps> = ({ embedded = false, initialTab = 'mail' }) => {
  const {
    gmailConfig,
    setGmailConfig,
    gmailMessages,
    unreadInboxCount,
    markMailRead,
    toggleMailStar,
    moveMailFolder,
    deleteMailForever,
    sendGmailMessage,
    simulateIncomingGmail,
    syncRealGmailOAuth,
    syncRealGmailImap,
  } = useOS();
  const { playSound } = useSound();

  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'folders' | 'search' | 'connect'>(
    initialTab === 'connect' ? 'connect' : 'inbox'
  );
  const [selectedFolder, setSelectedFolder] = useState<MailFolder | 'starred'>('inbox');
  const [filterSender, setFilterSender] = useState<'all' | 'unread' | 'starred'>('all');
  const [quickFind, setQuickFind] = useState('');
  const [selectedMsgId, setSelectedMsgId] = useState<string | null>(gmailMessages[0]?.id || null);
  const [readingModalMsg, setReadingModalMsg] = useState<GmailMessage | null>(null);

  // Compose state
  const [composeOpen, setComposeOpen] = useState(initialTab === 'write');
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [sending, setSending] = useState(false);

  // Real Gmail connection wizard state
  const [oauthClientId, setOauthClientId] = useState(gmailConfig.oauthClientId || '');
  const [manualToken, setManualToken] = useState(gmailConfig.accessToken || '');
  const [imapEmail, setImapEmail] = useState(gmailConfig.email || '');
  const [imapPass, setImapPass] = useState('');
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [syncBusy, setSyncBusy] = useState(false);

  const visibleMessages = gmailMessages.filter((m) => {
    if (selectedFolder === 'starred') {
      if (!m.starred || m.folder === 'trash') return false;
    } else if (m.folder !== selectedFolder) {
      return false;
    }
    if (filterSender === 'unread' && !m.unread) return false;
    if (filterSender === 'starred' && !m.starred) return false;
    if (quickFind.trim()) {
      const q = quickFind.toLowerCase();
      if (
        !m.subject.toLowerCase().includes(q) &&
        !m.from.toLowerCase().includes(q) &&
        !m.fromEmail.toLowerCase().includes(q) &&
        !m.body.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  const selectedMsg =
    visibleMessages.find((m) => m.id === selectedMsgId) || visibleMessages[0] || null;

  const openMessageReader = (msg: GmailMessage) => {
    setSelectedMsgId(msg.id);
    if (msg.unread) markMailRead(msg.id, false);
    setReadingModalMsg({ ...msg, unread: false });
  };

  const handleCheckNewMail = async () => {
    if (gmailConfig.mode === 'oauth' && gmailConfig.accessToken) {
      try {
        setSyncBusy(true);
        await syncRealGmailOAuth(gmailConfig.accessToken, gmailConfig.oauthClientId);
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setSyncBusy(false);
      }
    } else if (gmailConfig.mode === 'imap' && gmailConfig.appPassword) {
      try {
        setSyncBusy(true);
        await syncRealGmailImap(gmailConfig.email, gmailConfig.appPassword);
      } catch (err) {
        alert((err as Error).message);
      } finally {
        setSyncBusy(false);
      }
    } else {
      const newMsg = simulateIncomingGmail();
      setSelectedFolder('inbox');
      setActiveTab('inbox');
      setSelectedMsgId(newMsg.id);
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo.trim()) return;
    setSending(true);
    try {
      await sendGmailMessage(composeTo.trim(), composeSubject.trim(), composeBody);
      setComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
    } catch (err) {
      playSound('error');
      alert((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const handleGoogleOAuthSignIn = async () => {
    if (!oauthClientId.trim()) {
      setSyncStatus('Please enter a Google OAuth 2.0 Web Client ID first (or paste an Access Token below).');
      return;
    }
    setSyncBusy(true);
    setSyncStatus('Opening Google Sign-In popup...');
    try {
      const token = await requestGoogleOAuthToken(oauthClientId);
      setManualToken(token);
      const count = await syncRealGmailOAuth(token, oauthClientId);
      setSyncStatus(`Success! Live synced ${count} Gmail messages into your AOL Mailbox!`);
      setActiveTab('inbox');
      setSelectedFolder('inbox');
    } catch (err) {
      setSyncStatus(`OAuth Error: ${(err as Error).message}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleTokenSync = async () => {
    if (!manualToken.trim()) {
      setSyncStatus('Paste a Gmail OAuth Access Token first.');
      return;
    }
    setSyncBusy(true);
    setSyncStatus('Connecting to gmail.googleapis.com...');
    try {
      const count = await syncRealGmailOAuth(manualToken.trim(), oauthClientId);
      setSyncStatus(`Success! Synced ${count} real Gmail messages!`);
      setActiveTab('inbox');
      setSelectedFolder('inbox');
    } catch (err) {
      setSyncStatus(`Token Error: ${(err as Error).message}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const handleImapSync = async () => {
    if (!imapEmail.trim() || !imapPass.trim()) {
      setSyncStatus('Enter your @gmail.com address and 16-character Google App Password.');
      return;
    }
    setSyncBusy(true);
    setSyncStatus('Connecting to imap.gmail.com:993...');
    try {
      const count = await syncRealGmailImap(imapEmail.trim(), imapPass.trim());
      setSyncStatus(`Synced ${count} Gmail messages via IMAP!`);
      setActiveTab('inbox');
      setSelectedFolder('inbox');
    } catch (err) {
      setSyncStatus(`IMAP Note: ${(err as Error).message}`);
    } finally {
      setSyncBusy(false);
    }
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso.slice(0, 10);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: '2-digit' });
  };

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #d7e8f8 0%, #bfd9f2 100%)',
        fontFamily: 'Tahoma, Arial, sans-serif',
        minHeight: 0,
        position: 'relative',
      }}
    >
      {/* Top AOL Mailbox Header Bar (Exact match to Image 4) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: embedded ? '5px 10px' : '7px 12px',
          gap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            onClick={() => playSound('youveGotMail')}
            title='Click to play "You&apos;ve Got Mail!"'
            style={{ cursor: 'pointer' }}
          >
            <AOLMailboxIconSVG size={38} hasUnread={unreadInboxCount > 0} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <span style={{ fontWeight: 700, color: '#0d3166' }}>Search Mail:</span>
            <input
              value={quickFind}
              onChange={(e) => setQuickFind(e.target.value)}
              placeholder="Search Gmail inbox..."
              style={{
                width: 155,
                height: 22,
                border: '1px solid #5982b3',
                padding: '2px 6px',
                fontSize: 11,
              }}
            />
            <button
              onClick={() => setActiveTab('inbox')}
              style={{
                background: 'linear-gradient(180deg, #bdf09c 0%, #6ac238 100%)',
                border: '1px solid #357a10',
                borderRadius: 4,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: '#0f3b04',
                cursor: 'pointer',
              }}
            >
              Search
            </button>
          </div>
        </div>

        {/* Right Gmail Status & Write / Sync Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            onClick={() => setActiveTab('connect')}
            style={{
              background: gmailConfig.mode === 'demo' ? '#eef6ff' : '#dcfce7',
              border: '1px solid #6b97c7',
              borderRadius: 10,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 700,
              color: '#0e386d',
              cursor: 'pointer',
            }}
            title="Click to connect a live Google Gmail account"
          >
            📧 Gmail ({gmailConfig.mode === 'demo' ? 'Demo Ready' : 'Live Synced'}): {gmailConfig.email}
          </span>
          <button className="aol-pill-btn" onClick={() => setComposeOpen(true)}>
            ✍️ Write Mail
          </button>
          <button
            className="aol-pill-btn"
            onClick={handleCheckNewMail}
            disabled={syncBusy}
            title='Check Gmail & Play "You&apos;ve Got Mail!"'
          >
            🔔 {syncBusy ? 'Syncing...' : 'Check Mail'}
          </button>
        </div>
      </div>

      {/* Classic Glossy Blue AOL Tabs (Exact match to Image 4) */}
      <div className="aol-mail-tabs">
        <div
          className={`aol-mail-tab ${activeTab === 'inbox' && selectedFolder === 'inbox' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('inbox');
            setSelectedFolder('inbox');
          }}
        >
          Inbox &nbsp;
          <span
            style={{
              background: '#0b4a94',
              color: '#fff',
              borderRadius: 8,
              padding: '0 6px',
              fontSize: 10,
            }}
          >
            {unreadInboxCount}
          </span>
        </div>
        <div
          className={`aol-mail-tab ${selectedFolder === 'sent' && activeTab !== 'connect' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('sent');
            setSelectedFolder('sent');
          }}
        >
          Sent
        </div>
        <div
          className={`aol-mail-tab ${selectedFolder === 'starred' && activeTab !== 'connect' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('folders');
            setSelectedFolder('starred');
          }}
        >
          Saved / Starred
        </div>
        <div
          className={`aol-mail-tab ${activeTab === 'connect' ? 'active' : ''}`}
          onClick={() => setActiveTab('connect')}
          style={
            activeTab !== 'connect'
              ? { background: 'linear-gradient(180deg, #ff512f 0%, #cc1b00 100%)', borderColor: '#801100' }
              : undefined
          }
        >
          ⚡ Connect Real Gmail
        </div>
      </div>

      {/* Connect Real Gmail Panel */}
      {activeTab === 'connect' ? (
        <div
          style={{
            flex: 1,
            background: '#fff',
            margin: '6px 8px 8px',
            border: '1px solid #7ea4cf',
            padding: 14,
            overflowY: 'auto',
            fontSize: 11,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#0c357a' }}>
                Gmail Account Bridge for AOL 9.8 Mailbox
              </div>
              <div style={{ color: '#475569' }}>
                Power this authentic old-school AOL Mailbox with your real Google Gmail inbox!
              </div>
            </div>
            <button className="aol-pill-btn" onClick={() => setActiveTab('inbox')}>
              ← Back to Inbox
            </button>
          </div>

          {syncStatus && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #f59e0b',
                padding: '7px 10px',
                borderRadius: 4,
                marginBottom: 12,
                fontWeight: 700,
                color: '#78350f',
              }}
            >
              {syncStatus}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {/* Option 1: Browser Google OAuth 2.0 */}
            <div style={{ border: '1px solid #b7cfe8', borderRadius: 5, padding: 11, background: '#f7fbff' }}>
              <div style={{ fontWeight: 700, color: '#0d3b82', marginBottom: 5 }}>
                Method 1: Sign in with Google OAuth 2.0 (Browser Live Sync)
              </div>
              <p style={{ margin: '0 0 8px', color: '#334155', lineHeight: 1.4 }}>
                Connect directly from your browser to <code>gmail.googleapis.com</code>. Add{' '}
                <code style={{ background: '#e2e8f0', padding: '1px 4px' }}>{window.location.origin}</code> to your
                Google Cloud Web OAuth Client&apos;s Authorized JavaScript Origins:
              </p>
              <input
                className="xp-input"
                style={{ width: '100%', marginBottom: 7 }}
                placeholder="Google OAuth Client ID (e.g. 12345.apps.googleusercontent.com)"
                value={oauthClientId}
                onChange={(e) => setOauthClientId(e.target.value)}
              />
              <button className="aol-pill-btn" onClick={handleGoogleOAuthSignIn} disabled={syncBusy}>
                🔐 Sign in with Google Popup
              </button>

              <div style={{ borderTop: '1px solid #d0e1f4', marginTop: 10, paddingTop: 8 }}>
                <div style={{ fontWeight: 700, color: '#0d3b82', marginBottom: 4 }}>
                  Or Instant OAuth Access Token (Zero Setup!):
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginBottom: 5 }}>
                  Generate a token at <code>developers.google.com/oauthplayground</code> (Scope:{' '}
                  <code>https://mail.google.com/</code>) and paste below:
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <input
                    className="xp-input"
                    style={{ flex: 1 }}
                    placeholder="ya29.a0AfH6SM..."
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <button className="aol-pill-btn" onClick={handleTokenSync} disabled={syncBusy}>
                    Sync Token
                  </button>
                </div>
              </div>
            </div>

            {/* Option 2: IMAP/SMTP + Demo Reset */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ border: '1px solid #b7cfe8', borderRadius: 5, padding: 11, background: '#f7fbff' }}>
                <div style={{ fontWeight: 700, color: '#0d3b82', marginBottom: 5 }}>
                  Method 2: Gmail IMAP / SMTP (App Password)
                </div>
                <input
                  className="xp-input"
                  style={{ width: '100%', marginBottom: 6 }}
                  placeholder="yourname@gmail.com"
                  value={imapEmail}
                  onChange={(e) => setImapEmail(e.target.value)}
                />
                <input
                  type="password"
                  className="xp-input"
                  style={{ width: '100%', marginBottom: 7 }}
                  placeholder="16-char Google App Password"
                  value={imapPass}
                  onChange={(e) => setImapPass(e.target.value)}
                />
                <button className="aol-pill-btn" onClick={handleImapSync} disabled={syncBusy}>
                  Sync via IMAP/SMTP
                </button>
              </div>

              <div style={{ border: '1px solid #b7cfe8', borderRadius: 5, padding: 11, background: '#f0fdf4' }}>
                <div style={{ fontWeight: 700, color: '#14532d', marginBottom: 4 }}>
                  Interactive Demo Gmail Mode
                </div>
                <div style={{ color: '#166534', marginBottom: 7, lineHeight: 1.35 }}>
                  Use the built-in simulated Gmail inbox with instant Send, Folders, and &ldquo;You&apos;ve Got Mail!&rdquo; simulator.
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="aol-pill-btn"
                    onClick={() => {
                      setGmailConfig({ mode: 'demo', email: 'xp.user@gmail.com' });
                      setSyncStatus('Switched to Demo Gmail Mode (xp.user@gmail.com).');
                    }}
                  >
                    Use Demo Gmail
                  </button>
                  <button
                    className="aol-pill-btn"
                    onClick={() => {
                      localStorage.setItem('xp_gmail_msgs_v1', JSON.stringify(INITIAL_DEMO_GMAIL_MESSAGES));
                      window.location.reload();
                    }}
                  >
                    Reset Demo Mail
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Filter Bar: "Show me mail from: [Everyone v]" + Quick Find */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '5px 10px',
              fontSize: 11,
              color: '#0e3568',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>Show me mail from:</span>
              <select
                className="xp-select"
                value={filterSender}
                onChange={(e) => setFilterSender(e.target.value as 'all' | 'unread' | 'starred')}
              >
                <option value="all">Everyone</option>
                <option value="unread">Unread Mail Only</option>
                <option value="starred">Starred / Saved Mail</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  background: '#a6e278',
                  border: '1px solid #4e8c22',
                  borderRadius: 4,
                  padding: '2px 7px',
                  fontWeight: 700,
                }}
              >
                Quick Find:
              </span>
              <input
                className="xp-input"
                style={{ width: 135 }}
                value={quickFind}
                onChange={(e) => setQuickFind(e.target.value)}
                placeholder="Filter messages..."
              />
            </div>
          </div>

          {/* Main Split View: Left "My Mail Folders" + Right Message List & Preview */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '168px 1fr',
              gap: 6,
              padding: '0 8px 6px',
              minHeight: 0,
            }}
          >
            {/* Left Mail Folders Tree (Exact match to Image 4) */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #7ea4cf',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                overflowY: 'auto',
              }}
            >
              <div>
                <div
                  style={{
                    background: 'linear-gradient(180deg, #eff6fc 0%, #c8def5 100%)',
                    borderBottom: '1px solid #96b8df',
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#123a6d',
                  }}
                >
                  My Mail Folders
                </div>
                <div style={{ padding: 4, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'inbox' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('inbox')}
                  >
                    <span>📥</span>
                    <span>Inbox ({unreadInboxCount})</span>
                  </div>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'sent' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('sent')}
                  >
                    <span>📤</span>
                    <span>Sent</span>
                  </div>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'spam' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('spam')}
                  >
                    <span>🚫</span>
                    <span>Spam</span>
                  </div>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'trash' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('trash')}
                  >
                    <span>🗑️</span>
                    <span>Recently Deleted</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, marginTop: 6, paddingLeft: 4 }}>
                    ⊟ Saved on Gmail
                  </div>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'starred' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('starred')}
                    style={{ paddingLeft: 14 }}
                  >
                    <span>⭐</span>
                    <span>Incoming/Saved</span>
                  </div>
                  <div
                    className={`aol-folder-item ${selectedFolder === 'drafts' ? 'active' : ''}`}
                    onClick={() => setSelectedFolder('drafts')}
                    style={{ paddingLeft: 14 }}
                  >
                    <span>📝</span>
                    <span>Waiting To Be Sent</span>
                  </div>
                </div>
              </div>

              <div style={{ padding: 6, borderTop: '1px solid #dce8f5', textAlign: 'center' }}>
                <button
                  className="aol-pill-btn"
                  style={{ width: '100%', fontSize: 10 }}
                  onClick={handleCheckNewMail}
                >
                  🔊 Simulate New Gmail
                </button>
              </div>
            </div>

            {/* Right Pane: Mail List + Reading Preview */}
            <div
              style={{
                background: '#fff',
                border: '1px solid #7ea4cf',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
              }}
            >
              {/* Table Column Headers */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px 86px 168px 1fr',
                  background: 'linear-gradient(180deg, #eff6fc 0%, #c8def5 100%)',
                  borderBottom: '1px solid #96b8df',
                  padding: '4px 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#123a6d',
                }}
              >
                <span>Type</span>
                <span>Date ▼</span>
                <span>E-Mail Address</span>
                <span>Subject</span>
              </div>

              {/* Message Rows */}
              <div style={{ flex: 1, overflowY: 'auto', minHeight: 110 }}>
                {visibleMessages.length === 0 ? (
                  <div style={{ padding: 24, textAlign: 'center', color: '#64748b', fontSize: 12 }}>
                    No messages in this folder. Click <b>Check Mail</b> to check for new Gmail!
                  </div>
                ) : (
                  visibleMessages.map((m) => {
                    const isSel = selectedMsg?.id === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`aol-mail-row ${m.unread ? 'unread' : ''} ${isSel ? 'selected' : ''}`}
                        onClick={() => setSelectedMsgId(m.id)}
                        onDoubleClick={() => openMessageReader(m)}
                      >
                        <span
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleMailStar(m.id);
                          }}
                          title="Toggle Gmail Star"
                        >
                          {m.unread ? '✉️' : '📩'}
                          {m.starred ? '⭐' : ''}
                        </span>
                        <span>{formatShortDate(m.date)}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 6 }}>
                          {m.from}
                        </span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.subject}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Inline Reading Pane */}
              {selectedMsg && (
                <div
                  style={{
                    height: 138,
                    borderTop: '2px solid #8eb1d6',
                    background: '#fafcff',
                    padding: '8px 12px',
                    overflowY: 'auto',
                    fontSize: 11,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div>
                      <b>From:</b> {selectedMsg.from} &lt;{selectedMsg.fromEmail}&gt; &nbsp;|&nbsp;{' '}
                      <b>Subject:</b> {selectedMsg.subject}
                    </div>
                    <button
                      className="aol-pill-btn"
                      style={{ padding: '1px 8px', fontSize: 10 }}
                      onClick={() => openMessageReader(selectedMsg)}
                    >
                      Open Full Message
                    </button>
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', color: '#1e293b', lineHeight: 1.45 }}>
                    {selectedMsg.body}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Bar (Exact match to Image 4!) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '4px 10px 7px',
            }}
          >
            <div style={{ display: 'flex', gap: 5 }}>
              <button
                className="aol-pill-btn"
                disabled={!selectedMsg}
                onClick={() => selectedMsg && openMessageReader(selectedMsg)}
              >
                Read
              </button>
              <button
                className="aol-pill-btn"
                disabled={!selectedMsg}
                onClick={() => selectedMsg && toggleMailStar(selectedMsg.id)}
              >
                Save / Star
              </button>
              <button
                className="aol-pill-btn"
                disabled={!selectedMsg}
                onClick={() => selectedMsg && markMailRead(selectedMsg.id, true)}
              >
                Mark Unread
              </button>
              <button
                className="aol-pill-btn"
                onClick={() => {
                  if (!selectedMsg) return;
                  setComposeTo(selectedMsg.fromEmail);
                  setComposeSubject(
                    selectedMsg.subject.startsWith('Re:') ? selectedMsg.subject : `Re: ${selectedMsg.subject}`
                  );
                  setComposeBody(`\n\n--- Original Message from ${selectedMsg.from} ---\n${selectedMsg.body}`);
                  setComposeOpen(true);
                }}
              >
                Reply
              </button>
            </div>

            <div style={{ display: 'flex', gap: 5 }}>
              <button
                className="aol-pill-btn"
                disabled={!selectedMsg}
                onClick={() => selectedMsg && moveMailFolder(selectedMsg.id, 'spam')}
              >
                Report Spam
              </button>
              <button
                className="aol-pill-btn"
                disabled={!selectedMsg}
                onClick={() => {
                  if (!selectedMsg) return;
                  if (selectedMsg.folder === 'trash') {
                    deleteMailForever(selectedMsg.id);
                  } else {
                    moveMailFolder(selectedMsg.id, 'trash');
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </>
      )}

      {/* Classic AOL "Read Mail" Modal Overlay */}
      {readingModalMsg && (
        <div
          style={{
            position: 'absolute',
            inset: 16,
            background: '#eaf3fc',
            border: '2px solid #2b5d99',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 40,
          }}
        >
          <div className="aol-subwindow-title">
            <span>📖 {readingModalMsg.subject}</span>
            <button
              className="xp-btn"
              style={{ minHeight: 18, padding: '0 6px' }}
              onClick={() => setReadingModalMsg(null)}
            >
              ✕ Close
            </button>
          </div>
          <div style={{ padding: '8px 12px', background: '#d7e8f9', fontSize: 11, borderBottom: '1px solid #9abce0' }}>
            <div>
              <b>Subject:</b> {readingModalMsg.subject}
            </div>
            <div>
              <b>Date:</b> {new Date(readingModalMsg.date).toLocaleString()}
            </div>
            <div>
              <b>From:</b> {readingModalMsg.from} &lt;{readingModalMsg.fromEmail}&gt;
            </div>
            <div>
              <b>To:</b> {readingModalMsg.to}
            </div>
          </div>
          <div
            style={{
              flex: 1,
              background: '#fff',
              margin: 8,
              border: '1px solid #8eb1d6',
              padding: 12,
              overflowY: 'auto',
              fontSize: 12,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {readingModalMsg.body}
          </div>
          <div style={{ padding: '0 10px 8px', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="aol-pill-btn"
                onClick={() => {
                  setComposeTo(readingModalMsg.fromEmail);
                  setComposeSubject(`Re: ${readingModalMsg.subject}`);
                  setComposeBody(`\n\n--- On ${readingModalMsg.date}, ${readingModalMsg.from} wrote ---\n${readingModalMsg.body}`);
                  setReadingModalMsg(null);
                  setComposeOpen(true);
                }}
              >
                ↩ Reply
              </button>
              <button
                className="aol-pill-btn"
                onClick={() => {
                  setComposeTo('');
                  setComposeSubject(`Fwd: ${readingModalMsg.subject}`);
                  setComposeBody(`\n\n--- Forwarded Message ---\n${readingModalMsg.body}`);
                  setReadingModalMsg(null);
                  setComposeOpen(true);
                }}
              >
                ↪ Forward
              </button>
            </div>
            <button
              className="aol-pill-btn"
              onClick={() => {
                moveMailFolder(readingModalMsg.id, 'trash');
                setReadingModalMsg(null);
              }}
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      )}

      {/* Classic AOL "Write Mail" Compose Window */}
      {composeOpen && (
        <form
          onSubmit={handleSendMail}
          style={{
            position: 'absolute',
            inset: 18,
            background: '#dcebfa',
            border: '2px solid #2b5d99',
            borderRadius: 6,
            boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 45,
          }}
        >
          <div className="aol-subwindow-title">
            <span>✍️ Write Mail — Sending via Gmail ({gmailConfig.email})</span>
            <button
              type="button"
              className="xp-btn"
              style={{ minHeight: 18, padding: '0 6px' }}
              onClick={() => setComposeOpen(false)}
            >
              ✕
            </button>
          </div>
          <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, flex: 1, fontSize: 11 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', gap: 6 }}>
              <b>Send To:</b>
              <input
                required
                className="xp-input"
                placeholder="friend@gmail.com"
                value={composeTo}
                onChange={(e) => setComposeTo(e.target.value)}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', alignItems: 'center', gap: 6 }}>
              <b>Subject:</b>
              <input
                className="xp-input"
                placeholder="Hello from AOL 9.8 on Windows XP!"
                value={composeSubject}
                onChange={(e) => setComposeSubject(e.target.value)}
              />
            </div>
            {/* Classic AOL Formatting Bar */}
            <div
              style={{
                display: 'flex',
                gap: 6,
                background: '#eef5fc',
                border: '1px solid #96b8df',
                padding: '3px 6px',
                fontWeight: 700,
              }}
            >
              <span>Arial ▾</span>
              <span>10pt ▾</span>
              <b>B</b>
              <i>I</i>
              <u>U</u>
              <span style={{ color: '#1d4ed8' }}>A</span>
              <span
                style={{ cursor: 'pointer' }}
                onClick={() => setComposeBody((b) => b + ' :-) ')}
              >
                😊
              </span>
            </div>
            <textarea
              className="xp-textarea"
              style={{ flex: 1, resize: 'none', fontSize: 12 }}
              placeholder="Type your email message here..."
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#334155' }}>
                {gmailConfig.mode === 'demo'
                  ? 'Demo Gmail Mode: Saves to Sent folder immediately'
                  : `Live Gmail Mode: Sends real email from ${gmailConfig.email}`}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button type="button" className="aol-pill-btn" onClick={() => setComposeOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    background: 'linear-gradient(180deg, #2b88d9 0%, #0b4f9c 100%)',
                    color: '#fff',
                    border: '1px solid #062b59',
                    borderRadius: 4,
                    padding: '4px 16px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  📮 {sending ? 'Sending...' : 'Send Now'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
