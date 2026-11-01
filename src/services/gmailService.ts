export type MailFolder = 'inbox' | 'sent' | 'saved' | 'drafts' | 'spam' | 'trash';

export interface GmailMessage {
  id: string;
  threadId: string;
  folder: MailFolder;
  from: string;
  fromEmail: string;
  to: string;
  subject: string;
  date: string;
  unread: boolean;
  starred: boolean;
  snippet: string;
  body: string;
  htmlBody?: string;
}

export type GmailMode = 'demo' | 'oauth' | 'imap';

export interface GmailConnectionConfig {
  mode: GmailMode;
  email: string;
  oauthClientId?: string;
  accessToken?: string;
  appPassword?: string;
  lastSynced?: string;
}

export const INITIAL_DEMO_GMAIL_MESSAGES: GmailMessage[] = [
  {
    id: 'gmail-101',
    threadId: 'th-101',
    folder: 'inbox',
    from: 'Gmail Team (via AOL Bridge)',
    fromEmail: 'mail-noreply@google.com',
    to: 'xp.user@gmail.com',
    subject: 'Welcome to Gmail inside America Online 9.8!',
    date: '2026-11-01T08:15:00.000Z',
    unread: true,
    starred: true,
    snippet: 'Your Gmail inbox is now bridged directly into the classic AOL Desktop 9.8 Mailbox UI...',
    body: `Dear AOL & Gmail Member,

Welcome! Your Gmail inbox is running directly underneath the classic America Online 9.8.2 Mailbox interface!

What you can do right here:
• Read, Write, Reply, Forward, Search, and organize your Gmail folders (Inbox, Sent, Starred/Saved on AOL, Drafts, Spam, and Trash).
• Hear the iconic "You've got mail!" notification whenever new unread Gmail messages arrive.
• Click "Connect Real Gmail" in Mail Options (or the Connect Gmail tab) anytime to sign in with Google OAuth 2.0 and sync your live @gmail.com inbox directly in your browser!

Enjoy the golden age of the internet — with 15 GB of Google storage instead of 20 MB!

Sincerely,
The AOL-Gmail Retro Bridge Team`,
  },
  {
    id: 'gmail-102',
    threadId: 'th-102',
    folder: 'inbox',
    from: 'AOLWelcomeInfo',
    fromEmail: 'AOLWelcomeInfo@aol.com',
    to: 'xp.user@gmail.com',
    subject: 'Welcome to AOL Mail + 1045 Free Hours Activated!',
    date: '2026-10-31T19:42:00.000Z',
    unread: true,
    starred: false,
    snippet: 'Congratulations on connecting at 56,000 bps V.90! Check out AOL Keywords, AIM Buddy List, and Softpedia...',
    body: `Welcome to America Online!

Your 56K V.90 Dial-Up connection (959-262-8674) is active and your AIM Buddy List is signed on.

Try these classic features on your Windows XP PC:
1. Open Start -> All Programs -> Games to play 3D Pinball - Space Cadet, Minesweeper, Solitaire, Spider Solitaire, FreeCell, and Hearts!
2. Open "Add or Remove Programs" (or browse Softpedia in AOL/IE) to download & run .EXE Setup Wizards like Winamp 2.91, WinRAR, mIRC, Retro Arcade, and BonziBUDDY!
3. Chat with SmarterChild on your AIM Buddy List on the right!

America Online — So easy to use, no wonder it's #1!`,
  },
  {
    id: 'gmail-103',
    threadId: 'th-103',
    folder: 'inbox',
    from: 'Dave_Sk8er2004',
    fromEmail: 'davesk8er2004@gmail.com',
    to: 'xp.user@gmail.com',
    subject: 'Dude did you beat my 3D Pinball high score yet??',
    date: '2026-10-30T22:10:00.000Z',
    unread: false,
    starred: true,
    snippet: 'I just hit 1,420,500 on Space Cadet Pinball during computer lab!! Also grab Winamp from Softpedia...',
    body: `Yo!!

I just hit 1,420,500 on 3D Pinball Space Cadet! Bet you can't beat it.
Remember: Z and / are the flippers and Spacebar launches the ball, X nudges the table!

Also go to Add/Remove Programs or Softpedia and install Winamp 2.91 — the visualizer goes crazy. Hit me up on AIM!

- Dave`,
  },
  {
    id: 'gmail-104',
    threadId: 'th-104',
    folder: 'inbox',
    from: 'Google Security',
    fromEmail: 'no-reply@accounts.google.com',
    to: 'xp.user@gmail.com',
    subject: 'New sign-in on Windows XP Professional (Service Pack 3)',
    date: '2026-10-29T14:05:00.000Z',
    unread: false,
    starred: false,
    snippet: 'Your Google Account was just signed in to from a Windows XP Luna desktop via AOL 9.8...',
    body: `Google Account Sign-In Notification

We noticed a new sign-in to your Google Account on a classic device:
• OS: Microsoft Windows XP Professional SP3
• Client: America Online Desktop 9.8.2 (Gmail Bridge)
• Connection: 56K Dial-Up Modem (959-262-8674)

If this was you, you don't need to do anything — rock on like it's 2003!`,
  },
  {
    id: 'gmail-201',
    threadId: 'th-201',
    folder: 'sent',
    from: 'xp.user@gmail.com',
    fromEmail: 'xp.user@gmail.com',
    to: 'davesk8er2004@gmail.com',
    subject: 'Re: Gmail invite??',
    date: '2026-10-28T17:30:00.000Z',
    unread: false,
    starred: false,
    snippet: 'Thanks for sending me one of your 5 Gmail beta invites! 1 whole Gigabyte of email storage is unreal.',
    body: `Thanks for sending me one of your Gmail invites!!
1 whole Gigabyte of storage means I never have to delete an email ever again!`,
  },
  {
    id: 'gmail-301',
    threadId: 'th-301',
    folder: 'spam',
    from: 'CONGRATULATIONS WINNER 2004',
    fromEmail: 'prizes@free-ipod-mini-2004.biz',
    to: 'xp.user@gmail.com',
    subject: 'YOU ARE THE 1,000,000th VISITOR!! CLAIM FREE iPod Mini!',
    date: '2026-10-25T11:00:00.000Z',
    unread: false,
    starred: false,
    snippet: 'Shoot the monkey banner to claim your free silver 4GB iPod Mini today...',
    body: `CONGRATULATIONS!! Gmail Spam Filter caught this classic 2004 pop-up banner email!`,
  },
];

const SIMULATED_NEW_GMAIL_POOL = [
  {
    from: 'Mom',
    fromEmail: 'coolmom1998@gmail.com',
    subject: 'Get off the phone line!! I need to call Aunt Linda!',
    body: `Sweetie, every time I pick up the kitchen phone all I hear is SCREEEEECH-BZZZZT-KSHHHHH!
Please wrap up your AOL session soon so I can call Aunt Linda, and don't forget dinner is at 6!

Love, Mom`,
  },
  {
    from: 'YouTube Subscriptions (2005)',
    fromEmail: 'noreply@youtube.com',
    subject: 'jawed uploaded a new video: "Me at the zoo"',
    body: `New 240p video alert on YouTube!
"All right, so here we are in front of the elephants..."
Watch it in Internet Explorer (buffering on 56K may take 14 minutes).`,
  },
  {
    from: 'Netflix DVD Queue',
    fromEmail: 'info@netflix.com',
    subject: 'We shipped "The Matrix Reloaded (Disc 1)" in your red envelope!',
    body: `Good news! Your next DVD from the top of your Queue is in the mail and should arrive in 1-2 business days in our signature red envelope!`,
  },
  {
    from: 'Google Gmail Tips',
    fromEmail: 'gmail-tips@google.com',
    subject: 'Did you know? Use Search instead of sorting!',
    body: `With Gmail inside your AOL Mailbox, use the "Quick Find" box above your messages to instantly search across every sender and subject!`,
  },
];

let simCounter = 0;
export function createSimulatedIncomingGmail(toEmail: string): GmailMessage {
  const item = SIMULATED_NEW_GMAIL_POOL[simCounter % SIMULATED_NEW_GMAIL_POOL.length];
  simCounter += 1;
  const id = `gmail-sim-${Date.now()}-${simCounter}`;
  return {
    id,
    threadId: id,
    folder: 'inbox',
    from: item.from,
    fromEmail: item.fromEmail,
    to: toEmail,
    subject: item.subject,
    date: new Date().toISOString(),
    unread: true,
    starred: false,
    snippet: item.body.slice(0, 120).replace(/\n/g, ' '),
    body: item.body,
  };
}

// Helpers for Real Gmail REST API v1 in Browser
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const bin = atob(base64 + pad);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
  } catch {
    return '';
  }
}

function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface GmailApiPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailApiPart[];
}

function extractBodies(payload?: GmailApiPart): { text: string; html?: string } {
  if (!payload) return { text: '' };
  let text = '';
  let html: string | undefined;

  const walk = (part: GmailApiPart) => {
    if (part.mimeType === 'text/plain' && part.body?.data && !text) {
      text = decodeBase64Url(part.body.data);
    } else if (part.mimeType === 'text/html' && part.body?.data && !html) {
      html = decodeBase64Url(part.body.data);
    }
    if (part.parts) {
      part.parts.forEach(walk);
    }
  };
  walk(payload);

  if (!text && payload.body?.data) {
    text = decodeBase64Url(payload.body.data);
  }
  if (!text && html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    text = tmp.textContent || tmp.innerText || '';
  }
  return { text, html };
}

export async function loadGoogleIdentityScript(): Promise<void> {
  if ((window as unknown as { google?: { accounts?: unknown } }).google?.accounts) return;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-gsi="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gsi = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load https://accounts.google.com/gsi/client'));
    document.head.appendChild(script);
  });
}

export async function requestGoogleOAuthToken(clientId: string): Promise<string> {
  await loadGoogleIdentityScript();
  return new Promise<string>((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const googleObj = (window as any).google;
    if (!googleObj?.accounts?.oauth2) {
      reject(new Error('Google OAuth2 library unavailable.'));
      return;
    }
    const tokenClient = googleObj.accounts.oauth2.initTokenClient({
      client_id: clientId.trim(),
      scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/gmail.send',
      callback: (resp: { access_token?: string; error?: string; error_description?: string }) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description || resp.error || 'OAuth authorization failed.'));
        } else {
          resolve(resp.access_token);
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function fetchGmailMessagesWithToken(
  accessToken: string,
  maxResults = 25
): Promise<{ email: string; messages: GmailMessage[] }> {
  const headers = { Authorization: `Bearer ${accessToken.trim()}` };

  const profRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', { headers });
  if (!profRes.ok) {
    const errText = await profRes.text();
    throw new Error(`Gmail API auth failed (${profRes.status}): ${errText.slice(0, 140)}`);
  }
  const profile = (await profRes.json()) as { emailAddress: string };

  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`,
    { headers }
  );
  if (!listRes.ok) {
    throw new Error(`Failed to list Gmail messages (${listRes.status})`);
  }
  const listData = (await listRes.json()) as { messages?: Array<{ id: string; threadId: string }> };
  const refs = listData.messages || [];

  const detailed = await Promise.all(
    refs.map(async (ref) => {
      const mRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${ref.id}?format=full`,
        { headers }
      );
      if (!mRes.ok) return null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const m = (await mRes.json()) as any;
      const hdrs: Array<{ name: string; value: string }> = m.payload?.headers || [];
      const getH = (name: string) =>
        hdrs.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const fromFull = getH('From') || 'Unknown';
      const emailMatch = fromFull.match(/<([^>]+)>/);
      const fromEmail = emailMatch ? emailMatch[1] : fromFull;
      const fromDisplay = fromFull.replace(/<[^>]+>/, '').replace(/"/g, '').trim() || fromEmail;

      const labels: string[] = m.labelIds || [];
      let folder: MailFolder = 'inbox';
      if (labels.includes('TRASH')) folder = 'trash';
      else if (labels.includes('SPAM')) folder = 'spam';
      else if (labels.includes('DRAFT')) folder = 'drafts';
      else if (labels.includes('SENT') && !labels.includes('INBOX')) folder = 'sent';

      const bodies = extractBodies(m.payload);
      const parsedDate = getH('Date') ? new Date(getH('Date')) : new Date(Number(m.internalDate || Date.now()));

      return {
        id: m.id,
        threadId: m.threadId || m.id,
        folder,
        from: fromDisplay,
        fromEmail,
        to: getH('To') || profile.emailAddress,
        subject: getH('Subject') || '(No Subject)',
        date: isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString(),
        unread: labels.includes('UNREAD'),
        starred: labels.includes('STARRED'),
        snippet: m.snippet || bodies.text.slice(0, 120),
        body: bodies.text || m.snippet || '',
        htmlBody: bodies.html,
      } as GmailMessage;
    })
  );

  return {
    email: profile.emailAddress,
    messages: detailed.filter((x): x is GmailMessage => Boolean(x)),
  };
}

export async function sendGmailWithToken(
  accessToken: string,
  fromEmail: string,
  to: string,
  subject: string,
  body: string
): Promise<void> {
  const mime = [
    `From: ${fromEmail}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    body,
  ].join('\r\n');

  const raw = encodeBase64Url(mime);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gmail send failed (${res.status}): ${err.slice(0, 140)}`);
  }
}

export async function modifyGmailLabelsWithToken(
  accessToken: string,
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<void> {
  if (messageId.startsWith('gmail-') || messageId.startsWith('imap-')) return;
  await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  }).catch(() => {});
}
