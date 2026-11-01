import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import nodemailer from 'nodemailer';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export async function gmailApiMiddleware(req, res, next) {
  if (!req.url || !req.url.startsWith('/api/')) return next();

  if (req.url === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, service: 'Windows XP AOL-Gmail Bridge' });
  }

  if (req.url === '/api/gmail/imap-sync' && req.method === 'POST') {
    try {
      const { email, appPassword, limit = 25 } = await parseBody(req);
      if (!email || !appPassword) {
        return sendJson(res, 400, { error: 'Email and Gmail App Password are required.' });
      }
      const client = new ImapFlow({
        host: 'imap.gmail.com',
        port: 993,
        secure: true,
        auth: { user: email, pass: appPassword.replace(/\s+/g, '') },
        logger: false,
      });
      await client.connect();
      const messages = [];
      const lock = await client.getMailboxLock('INBOX');
      try {
        const total = client.mailbox.exists || 0;
        if (total > 0) {
          const start = Math.max(1, total - Number(limit) + 1);
          for await (const msg of client.fetch(`${start}:*`, {
            envelope: true,
            flags: true,
            source: true,
            uid: true,
          })) {
            const parsed = await simpleParser(msg.source);
            const fromAddr = msg.envelope?.from?.[0];
            const fromStr = fromAddr
              ? fromAddr.name
                ? `${fromAddr.name} <${fromAddr.address}>`
                : fromAddr.address
              : 'Unknown Sender';
            messages.push({
              id: `imap-${msg.uid}`,
              threadId: `imap-${msg.uid}`,
              folder: 'inbox',
              from: fromStr || 'Unknown',
              fromEmail: fromAddr?.address || 'unknown@gmail.com',
              to: email,
              subject: msg.envelope?.subject || '(No Subject)',
              date: (msg.envelope?.date || new Date()).toISOString(),
              unread: !msg.flags?.has('\\Seen'),
              starred: Boolean(msg.flags?.has('\\Flagged')),
              snippet: (parsed.text || '').slice(0, 140),
              body: parsed.text || parsed.html || '',
              htmlBody: parsed.html || undefined,
            });
          }
        }
      } finally {
        lock.release();
      }
      await client.logout();
      messages.reverse();
      return sendJson(res, 200, { email, messages });
    } catch (err) {
      return sendJson(res, 502, {
        error: err?.message || 'Unable to reach imap.gmail.com from server; use Browser Google OAuth / Token mode instead.',
      });
    }
  }

  if (req.url === '/api/gmail/smtp-send' && req.method === 'POST') {
    try {
      const { email, appPassword, to, subject, body } = await parseBody(req);
      if (!email || !appPassword || !to) {
        return sendJson(res, 400, { error: 'Missing email, appPassword, or recipient.' });
      }
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: email, pass: appPassword.replace(/\s+/g, '') },
      });
      await transporter.sendMail({
        from: email,
        to,
        subject: subject || '(No Subject)',
        text: body || '',
      });
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      return sendJson(res, 502, {
        error: err?.message || 'Unable to reach smtp.gmail.com from server; use Browser Google OAuth / Token mode instead.',
      });
    }
  }

  return next();
}
