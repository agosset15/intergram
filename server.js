const compression = require('compression');
const cors = require('cors');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Redis = require('ioredis');
const { createAdapter } = require('@socket.io/redis-adapter');

app.use(express.static('dist', {index: 'demo.html', maxage: '4h'}));
app.use(express.json());

// --- Configuration ---
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const API_BASE = process.env.API_BASE;
const META_WHITELIST = (process.env.META_PARAMS || 'uid,plan,email,source,username')
    .split(',').map(s => s.trim()).filter(Boolean);
const MAX_META_VALUE_LENGTH = 200;
const MAX_META_PARAMS = 10;
const SESSION_PREFIX = 'ig:session:';
const SESSION_TTL = 7 * 24 * 3600; // 7 days

// --- Redis setup (graceful: fall back to in-memory if Redis is unavailable) ---
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const memSessions = new Map(); // fallback when Redis is down
let redisOk = false;

const pubClient = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
});
const subClient = pubClient.duplicate();

Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
        io.adapter(createAdapter(pubClient, subClient));
        redisOk = true;
        console.log('Redis connected: ' + REDIS_URL);
    })
    .catch(err => {
        console.warn('Redis unavailable, using in-memory sessions:', err.message);
    });

pubClient.on('error', err => {
    if (redisOk) console.warn('Redis error:', err.message);
    redisOk = false;
});
pubClient.on('ready', () => {
    redisOk = true;
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Redis reconnected');
});

async function getSession(conversationId) {
    if (redisOk) {
        try {
            const raw = await pubClient.get(SESSION_PREFIX + conversationId);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { /* fall through */ }
    }
    return memSessions.get(conversationId) || null;
}

async function setSession(conversationId, session) {
    if (redisOk) {
        try {
            await pubClient.set(SESSION_PREFIX + conversationId, JSON.stringify(session), 'EX', SESSION_TTL);
            return;
        } catch (e) { /* fall through */ }
    }
    memSessions.set(conversationId, session);
}

// --- Helpers ---
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function sanitizeMeta(rawMeta) {
    const clean = {};
    if (!rawMeta || typeof rawMeta !== 'object') return clean;
    let count = 0;
    for (const key of META_WHITELIST) {
        if (count >= MAX_META_PARAMS) break;
        if (!Object.prototype.hasOwnProperty.call(rawMeta, key)) continue;
        let value = rawMeta[key];
        if (value === undefined || value === null) continue;
        value = String(value).slice(0, MAX_META_VALUE_LENGTH);
        if (!value.length) continue;
        clean[key] = value;
        count++;
    }
    return clean;
}

async function fetchUserSummary(meta) {
    if (!API_BASE) return '';
    const query = meta.uid ? ('uid=' + encodeURIComponent(meta.uid))
        : meta.username ? ('username=' + encodeURIComponent(meta.username))
            : null;
    if (!query) return '';
    try {
        const userRes = await fetch(API_BASE + '/users?' + query);
        if (!userRes.ok) return '';
        const user = await userRes.json();
        const id = user && user.id;
        if (!id) return '';
        const sumRes = await fetch(API_BASE + '/users/' + encodeURIComponent(id) + '/summary');
        if (!sumRes.ok) return '';
        return (await sumRes.text()) || '';
    } catch (e) {
        console.error('API_BASE fetch failed', e.message);
        return '';
    }
}

function buildCard(conversationId, meta, summary) {
    const lines = ['🆕 <b>New conversation</b>'];
    for (const key of Object.keys(meta)) {
        lines.push(escapeHtml(key) + ': ' + escapeHtml(meta[key]));
    }
    if (summary) {
        lines.push('');
        lines.push(escapeHtml(summary.slice(0, 1000)));
    }
    return conversationId + ': ' + lines.join('\n');
}

function extractConversationId(replyText) {
    const m = /^([^\s:]+):/.exec(replyText || '');
    return m ? m[1] : (replyText || '').split(':')[0];
}

// --- Telegram webhook ---
app.post('/hook', function(req, res) {
    try {
        const message = req.body.message || req.body.channel_post;
        const name = message.chat.first_name || message.chat.title || 'admin';
        const text = message.text || '';
        const reply = message.reply_to_message;

        if (text.startsWith('/start')) {
            console.log('/start from chatId ' + message.chat.id);
            sendTelegramMessage(
                '*Intergram connected*\nThis chat will receive visitor messages.\n' +
                'Reply to a message to answer that visitor; send a plain message to broadcast.',
                'Markdown');
        } else if (reply) {
            const conversationId = extractConversationId(reply.text);
            io.to(conversationId).emit('chat-message', {name, text, from: 'admin'});
        } else if (text) {
            io.emit('chat-message', {name, text, from: 'admin'});
        }
    } catch (e) {
        console.error('hook error', e, req.body);
    }
    res.statusCode = 200;
    res.end();
});

// --- Socket.io visitors ---
io.on('connection', function(socket) {

    socket.on('register', async function(registerMsg) {
        const conversationId = registerMsg.conversationId;
        if (!conversationId) return;
        let messageReceived = false;
        socket.join(conversationId);

        // Load persisted session (survives restarts); merge fresh meta from this connect.
        const stored = await getSession(conversationId) || {carded: false};
        stored.meta = sanitizeMeta(registerMsg.visitorMeta);
        stored.visitorName = registerMsg.visitorName || '';
        await setSession(conversationId, stored);
        console.log('conversation ' + conversationId + ' connected (redis=' + redisOk + ')');

        socket.on('visitor-message', async function(msg) {
            messageReceived = true;
            const text = (msg && msg.text) || '';
            io.to(conversationId).emit('chat-message', {text, from: 'visitor'});

            const s = await getSession(conversationId) || stored;
            if (!s.carded) {
                s.carded = true;
                await setSession(conversationId, s);
                const summary = await fetchUserSummary(s.meta);
                sendTelegramMessage(buildCard(conversationId, s.meta, summary), 'HTML');
            }
            const visitorName = s.visitorName ? '[' + s.visitorName + ']: ' : '';
            sendTelegramMessage(conversationId + ': ' + visitorName + ' ' + text);
        });

        socket.on('disconnect', function() {
            if (messageReceived) {
                sendTelegramMessage(conversationId + ' has left');
            }
        });
    });

});

function sendTelegramMessage(text, parseMode) {
    const body = new URLSearchParams({chat_id: TELEGRAM_CHAT_ID, text});
    if (parseMode) body.set('parse_mode', parseMode);
    fetch('https://api.telegram.org/bot' + TELEGRAM_TOKEN + '/sendMessage', {
        method: 'POST',
        body
    }).catch(e => console.error('sendTelegramMessage failed', e.message));
}

app.post('/usage-start', cors(), function(req, res) {
    console.log('usage from', req.query.host);
    res.statusCode = 200;
    res.end();
});

app.post('/usage-end', cors(), function(req, res) {
    res.statusCode = 200;
    res.end();
});

http.listen(process.env.PORT || 3000, function() {
    console.log('listening on port:' + (process.env.PORT || 3000));
});

app.get('/.well-known/acme-challenge/:content', (req, res) => {
    res.send(process.env.CERTBOT_RESPONSE);
});
