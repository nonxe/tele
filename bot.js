const TelegramBot = require("node-telegram-bot-api");
const https = require("https");
const http = require("http");

// ─── Config ─────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const GH_PAT = process.env.GH_PAT || "";
const TELEDB_REPO = "nonxe/teledb";
const TELEDB_FILE = "stats.json";
const CROSSDEVICE_REPO = "nonxe/crossdevice";
const CROSSDEVICE_FILE = "clipboard.json";
const LINKS_REPO = "nonxe/link";
const LINKS_FILE = "links.txt";

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("🤖 AS Cloud Bot is running...");

// ─── Language System ────────────────────────────────────────────

const userLang = {}; // chatId -> "en" | "ko"

const LANG = {
  en: {
    welcome: `☁️ *AS CLOUD SERVICES BOT*

Welcome! Access all Cloud services right here in Telegram.

*Available Commands:*

🎥 *YouTube Downloader*
/yt \`<url>\` — Download YouTube videos (HD MP4)

🤖 *AI Chat*
/ai \`<prompt>\` — Claude 4.5 Haiku (fast)
/opus \`<prompt>\` — Claude 4.8 Opus (deep reasoning)

📸 *Instagram*
/insta \`<url>\` — Download Instagram Reels & videos

📧 *Temp Mail (Guerrilla Mail)*
/tempmail — Generate a temporary disposable email
/inbox — Check your inbox messages
/readmail \`<number>\` — Read a specific email

🔗 *Link Shortener*
/shorten \`<slug>\` \`<url>\` — Create a short link
/mylinks — View your short links

📋 *Cross-Device Clipboard*
/send \`<text>\` — Send text, get 7-digit code
/receive \`<code>\` — Receive by 7-digit code

🌐 *Settings*
/lang — Change language (English / 한국어)
/help — Show this menu

_Powered by AS Cloud System_`,

    help: `☁️ *AS Cloud Bot — Help*

🎥 /yt \`url\` — Download YouTube Video (HD MP4)
🤖 /ai \`prompt\` — Ask Claude Haiku
🧠 /opus \`prompt\` — Ask Claude Opus
📸 /insta \`url\` — Download Instagram Reel
📧 /tempmail — Generate temp disposable email
📬 /inbox — Check temp mail inbox
📖 /readmail \`N\` — Read email #N
🔗 /shorten \`slug\` \`url\` — Create short link
📋 /send \`text\` — Clipboard send
📋 /receive \`code\` — Clipboard receive
🌐 /lang — Switch language

_No limits. No sign-ups. Just use._`,

    langChanged: "✅ Language set to *English*.",
    langPrompt: "🌐 Choose your language:",
    thinking_haiku: "🤖 _Thinking with Claude 4.5 Haiku..._",
    thinking_opus: "🧠 _Thinking with Claude 4.8 Opus..._",
    yt_fetching: "🎥 _Fetching YouTube video & direct HD download stream..._",
    yt_noUrl: "❌ Please provide a YouTube URL.\n\nUsage: `/yt https://www.youtube.com/watch?v=...`",
    yt_fail: "❌ YouTube download failed",
    insta_fetching: "📸 _Fetching Instagram content..._",
    insta_noUrl: "❌ Please provide an Instagram URL.\n\nUsage: `/insta https://instagram.com/reel/...`",
    insta_fail: "❌ Instagram download failed",
    tempmail_generating: "📧 _Generating disposable email address..._",
    tempmail_created: "📧 *Disposable Email Created!*",
    tempmail_address: "📬 Address",
    tempmail_tip: "_Emails sent to this address will arrive here. Use /inbox to check._",
    tempmail_noAccount: "❌ No active temp mail session. Use /tempmail to create one.",
    inbox_checking: "📬 _Checking inbox..._",
    inbox_empty: "📭 *Inbox is empty.*\n\n_New emails will appear here. Send an email and use /inbox to refresh._",
    inbox_title: "📬 *Inbox*",
    inbox_from: "From",
    inbox_subject: "Subject",
    readmail_reading: "📖 _Loading email content..._",
    readmail_noNum: "❌ Please specify email number.\n\nUsage: `/readmail 1`",
    readmail_notFound: "❌ Email not found. Use /inbox to view available messages.",
    shorten_creating: "🔗 _Creating short link..._",
    shorten_usage: "❌ Usage: `/shorten myslug https://example.com`",
    shorten_success: "🔗 *Link Created!*",
    shorten_shortUrl: "Short URL",
    shorten_original: "Target",
    mylinks_loading: "🔗 _Loading your links..._",
    mylinks_empty: "📭 You haven't created any short links yet.\n\nUse `/shorten slug url` to create one.",
    mylinks_title: "🔗 *Your Short Links*",
    clipboard_saving: "📋 _Saving to clipboard..._",
    clipboard_sent: "📋 *Clipboard — Sent!*",
    clipboard_code: "🔑 Your code",
    clipboard_sentTip: "_Use this 7-digit code on any device to receive your text._",
    clipboard_noText: "❌ Please provide text to send.\n\nUsage: `/send Hello World`",
    clipboard_looking: "📋 _Looking up clipboard code..._",
    clipboard_received: "📋 *Clipboard — Received!*",
    clipboard_text: "📝 Text",
    clipboard_media: "📎 Media",
    clipboard_notFound: "❌ No clipboard entry found for this code.\n\n_Make sure you entered a valid 7-digit code._",
    unknownCmd: "❓ Unknown command. Type /help to see available commands.",
    error: "❌ Error",
    visitCloud: "🌐 Visit AS Cloud",
  },

  ko: {
    welcome: `☁️ *AS 클라우드 서비스 봇*

환영합니다! 텔레그램에서 모든 클라우드 서비스를 이용하세요.

*사용 가능한 명령어:*

🎥 *유튜브 다운로더*
/yt \`<URL>\` — 유튜브 고화질 비디오 다운로드 (HD MP4)

🤖 *AI 채팅*
/ai \`<질문>\` — Claude 4.5 Haiku (빠른 응답)
/opus \`<질문>\` — Claude 4.8 Opus (심층 추론)

📸 *인스타그램*
/insta \`<URL>\` — 인스타그램 릴스 & 영상 다운로드

📧 *임시 메일 (Guerrilla Mail)*
/tempmail — 임시 이메일 생성
/inbox — 받은편지함 확인
/readmail \`<번호>\` — 특정 이메일 읽기

🔗 *링크 단축*
/shorten \`<슬러그>\` \`<URL>\` — 단축 링크 생성
/mylinks — 내 단축 링크 보기

📋 *크로스 디바이스 클립보드*
/send \`<텍스트>\` — 텍스트 전송, 7자리 코드 받기
/receive \`<코드>\` — 7자리 코드로 수신

🌐 *설정*
/lang — 언어 변경 (English / 한국어)
/help — 이 메뉴 보기

_AS Cloud System 제공_`,

    help: `☁️ *AS Cloud 봇 — 도움말*

🎥 /yt \`URL\` — 유튜브 비디오 다운로드 (HD MP4)
🤖 /ai \`질문\` — Claude Haiku에게 질문
🧠 /opus \`질문\` — Claude Opus에게 질문
📸 /insta \`URL\` — 인스타그램 릴스 다운로드
📧 /tempmail — 임시 이메일 생성
📬 /inbox — 받은편지함 확인
📖 /readmail \`N\` — N번 이메일 읽기
🔗 /shorten \`슬러그\` \`URL\` — 단축 링크 생성
📋 /send \`텍스트\` — 클립보드 전송
📋 /receive \`코드\` — 클립보드 수신
🌐 /lang — 언어 전환

_제한 없음. 가입 없음. 바로 사용._`,

    langChanged: "✅ 언어가 *한국어*로 설정되었습니다.",
    langPrompt: "🌐 언어를 선택하세요:",
    thinking_haiku: "🤖 _Claude 4.5 Haiku로 생각 중..._",
    thinking_opus: "🧠 _Claude 4.8 Opus로 생각 중..._",
    yt_fetching: "🎥 _유튜브 비디오 다운로드 스트림 가져오는 중..._",
    yt_noUrl: "❌ 유튜브 URL을 입력하세요.\n\n사용법: `/yt https://www.youtube.com/watch?v=...`",
    yt_fail: "❌ 유튜브 다운로드 실패",
    insta_fetching: "📸 _인스타그램 콘텐츠 가져오는 중..._",
    insta_noUrl: "❌ 인스타그램 URL을 입력하세요.\n\n사용법: `/insta https://instagram.com/reel/...`",
    insta_fail: "❌ 인스타그램 다운로드 실패",
    tempmail_generating: "📧 _임시 이메일 생성 중..._",
    tempmail_created: "📧 *임시 이메일 생성 완료!*",
    tempmail_address: "📬 주소",
    tempmail_tip: "_이메일이 여기로 도착합니다. /inbox로 확인하세요._",
    tempmail_noAccount: "❌ 활성 임시 메일이 없습니다. /tempmail로 생성하세요.",
    inbox_checking: "📬 _받은편지함 확인 중..._",
    inbox_empty: "📭 *받은편지함이 비어있습니다.*\n\n_새 이메일이 여기에 표시됩니다. /inbox로 새로고침하세요._",
    inbox_title: "📬 *받은편지함*",
    inbox_from: "보낸이",
    inbox_subject: "제목",
    readmail_reading: "📖 _이메일 내용 로딩 중..._",
    readmail_noNum: "❌ 이메일 번호를 지정하세요.\n\n사용법: `/readmail 1`",
    readmail_notFound: "❌ 이메일을 찾을 수 없습니다. /inbox로 확인하세요.",
    shorten_creating: "🔗 _단축 링크 생성 중..._",
    shorten_usage: "❌ 사용법: `/shorten myslug https://example.com`",
    shorten_success: "🔗 *링크 생성 완료!*",
    shorten_shortUrl: "단축 URL",
    shorten_original: "원본",
    mylinks_loading: "🔗 _링크 로딩 중..._",
    mylinks_empty: "📭 아직 단축 링크가 없습니다.\n\n`/shorten 슬러그 URL`로 생성하세요.",
    mylinks_title: "🔗 *내 단축 링크*",
    clipboard_saving: "📋 _클립보드에 저장 중..._",
    clipboard_sent: "📋 *클립보드 — 전송 완료!*",
    clipboard_code: "🔑 코드",
    clipboard_sentTip: "_이 7자리 코드를 다른 기기에서 사용하여 텍스트를 받으세요._",
    clipboard_noText: "❌ 전송할 텍스트를 입력하세요.\n\n사용법: `/send 안녕하세요`",
    clipboard_looking: "📋 _클립보드 코드 확인 중..._",
    clipboard_received: "📋 *클립보드 — 수신 완료!*",
    clipboard_text: "📝 텍스트",
    clipboard_media: "📎 미디어",
    clipboard_notFound: "❌ 이 코드에 해당하는 클립보드 항목이 없습니다.\n\n_유효한 7자리 코드를 입력했는지 확인하세요._",
    unknownCmd: "❓ 알 수 없는 명령어입니다. /help를 입력하여 사용 가능한 명령어를 확인하세요.",
    error: "❌ 오류",
    visitCloud: "🌐 AS Cloud 방문",
  },
};

function t(chatId, key) {
  const lang = userLang[chatId] || "en";
  return LANG[lang][key] || LANG.en[key] || key;
}

// ─── HTML Stripper ──────────────────────────────────────────────

function stripHtml(html) {
  if (!html) return "";
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*[\/]?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

// ─── Helpers ────────────────────────────────────────────────────

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    }).on("error", reject);
  });
}

function fetchWithHeaders(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;
    const reqOpts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: options.method || "GET",
      headers: {
        "User-Agent": "ASCloud-TeleBot/1.0",
        "Content-Type": "application/json",
        ...options.headers,
      },
    };

    const req = mod.request(reqOpts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

function githubAPI(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const reqOpts = {
      hostname: "api.github.com",
      path: endpoint,
      method: method,
      headers: {
        "User-Agent": "ASCloud-TeleBot/1.0",
        "Authorization": "token " + GH_PAT,
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    };

    const req = https.request(reqOpts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Track usage in nonxe/teledb
async function trackUsage(userId, command) {
  if (!GH_PAT) return;
  try {
    const path = "/repos/" + TELEDB_REPO + "/contents/" + TELEDB_FILE;
    const res = await githubAPI("GET", path);
    let sha = null;
    let stats = { totalCommands: 0, users: {}, commands: {} };

    if (res.status === 200 && res.data.content) {
      sha = res.data.sha;
      const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
      try { stats = JSON.parse(decoded); } catch {}
    }

    stats.totalCommands = (stats.totalCommands || 0) + 1;
    if (!stats.users) stats.users = {};
    stats.users[userId] = (stats.users[userId] || 0) + 1;
    if (!stats.commands) stats.commands = {};
    stats.commands[command] = (stats.commands[command] || 0) + 1;
    stats.lastUpdated = new Date().toISOString();

    const body = {
      message: "Update stats: " + command + " by " + userId,
      content: Buffer.from(JSON.stringify(stats, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;
    await githubAPI("PUT", path, body);
  } catch (e) {
    console.warn("Stats tracking error:", e.message);
  }
}

// ─── Cross-Device Clipboard Functions ───────────────────────────

async function clipboardSend(text) {
  if (!GH_PAT) return { success: false, error: "GitHub PAT not configured" };
  try {
    const path = "/repos/" + CROSSDEVICE_REPO + "/contents/" + CROSSDEVICE_FILE;
    const res = await githubAPI("GET", path);
    let sha = null;
    let items = [];

    if (res.status === 200 && res.data.content) {
      sha = res.data.sha;
      const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
      try { items = JSON.parse(decoded); if (!Array.isArray(items)) items = []; } catch { items = []; }
    }

    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = Math.floor(1000000 + Math.random() * 9000000).toString();
      if (!items.some((item) => item.code === candidate)) { code = candidate; break; }
    }
    if (!code) code = Math.floor(1000000 + Math.random() * 9000000).toString();

    const newItem = { code, type: "text", text, createdAt: new Date().toISOString() };
    items = [newItem, ...items].slice(0, 200);

    const body = {
      message: "Add clipboard item " + code + " via Telegram",
      content: Buffer.from(JSON.stringify(items, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) return { success: true, code };
    return { success: false, error: "GitHub API error (" + putRes.status + ")" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function clipboardReceive(code) {
  if (!GH_PAT) return null;
  const cleanCode = code.trim().replace(/\D/g, "");
  if (!cleanCode || cleanCode.length !== 7) return null;
  try {
    const path = "/repos/" + CROSSDEVICE_REPO + "/contents/" + CROSSDEVICE_FILE;
    const res = await githubAPI("GET", path);
    if (res.status !== 200 || !res.data.content) return null;
    const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
    let items = [];
    try { items = JSON.parse(decoded); } catch { return null; }
    return items.find((i) => i.code === cleanCode) || null;
  } catch { return null; }
}

// ─── Link Shortener Functions ───────────────────────────────────

async function createShortLink(slug, url, createdBy) {
  if (!GH_PAT) return { success: false, error: "GitHub PAT not configured" };
  try {
    const path = "/repos/" + LINKS_REPO + "/contents/" + LINKS_FILE;
    const res = await githubAPI("GET", path);
    let sha = null;
    let links = [];

    if (res.status === 200 && res.data.content) {
      sha = res.data.sha;
      const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
      try { links = JSON.parse(decoded); if (!Array.isArray(links)) links = []; } catch { links = []; }
    }

    if (links.some((l) => l.slug === slug)) {
      return { success: false, error: 'Slug "' + slug + '" already exists.' };
    }

    const newLink = { slug, url, createdBy, createdAt: new Date().toISOString(), clicks: 0 };
    links.push(newLink);

    const body = {
      message: "Add short link /" + slug + " via Telegram",
      content: Buffer.from(JSON.stringify(links, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) return { success: true, link: newLink };
    return { success: false, error: "GitHub API error (" + putRes.status + ")" };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getUserLinks(userId) {
  if (!GH_PAT) return [];
  try {
    const path = "/repos/" + LINKS_REPO + "/contents/" + LINKS_FILE;
    const res = await githubAPI("GET", path);
    if (res.status !== 200 || !res.data.content) return [];
    const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
    let links = [];
    try { links = JSON.parse(decoded); } catch { return []; }
    return links.filter((l) => l.createdBy === userId);
  } catch { return []; }
}

// ─── Temp Mail State ────────────────────────────────────────────

const tempMailState = {}; // chatId -> { email, sidToken, messages: [] }

// ─── /start Command ─────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/start");

  bot.sendMessage(chatId, t(chatId, "welcome"), {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: t(chatId, "visitCloud"), url: "https://ascloud.vercel.app" }],
      ],
    },
  });
});

// ─── /help Command ──────────────────────────────────────────────

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/help");
  bot.sendMessage(chatId, t(chatId, "help"), { parse_mode: "Markdown" });
});

// ─── /lang Command ──────────────────────────────────────────────

bot.onText(/\/lang/, (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/lang");

  bot.sendMessage(chatId, t(chatId, "langPrompt"), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🇺🇸 English", callback_data: "lang_en" },
          { text: "🇰🇷 한국어", callback_data: "lang_ko" },
        ],
      ],
    },
  });
});

// ─── Callback Query (Language & Inbox Refresh) ──────────────────

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;

  if (query.data === "lang_en") {
    userLang[chatId] = "en";
    bot.answerCallbackQuery(query.id, { text: "Language set to English" });
    bot.editMessageText(t(chatId, "langChanged"), {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
    });
  } else if (query.data === "lang_ko") {
    userLang[chatId] = "ko";
    bot.answerCallbackQuery(query.id, { text: "언어가 한국어로 설정되었습니다" });
    bot.editMessageText(t(chatId, "langChanged"), {
      chat_id: chatId,
      message_id: query.message.message_id,
      parse_mode: "Markdown",
    });
  } else if (query.data === "check_inbox") {
    const state = tempMailState[chatId];
    if (!state || !state.sidToken) {
      bot.answerCallbackQuery(query.id, { text: "No active temp mail" });
      return bot.sendMessage(chatId, t(chatId, "tempmail_noAccount"), { parse_mode: "Markdown" });
    }

    bot.answerCallbackQuery(query.id, { text: "Refreshing inbox..." });

    try {
      const res = await fetchJSON("https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=" + encodeURIComponent(state.sidToken));
      const messages = (res && Array.isArray(res.list)) ? res.list : [];
      state.messages = messages;

      if (messages.length === 0) {
        await bot.editMessageText(
          "📬 *" + state.email + "*\n\n" + t(chatId, "inbox_empty"),
          {
            chat_id: chatId,
            message_id: query.message.message_id,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "🔄 Refresh Inbox", callback_data: "check_inbox" }]
              ]
            }
          }
        );
        return;
      }

      let text = "📬 *Inbox for* `" + state.email + "` (" + messages.length + ")\n\n";
      messages.slice(0, 10).forEach((m, i) => {
        const from = m.mail_from || "Unknown";
        const subject = m.mail_subject || "(No subject)";
        const date = m.mail_date || "";
        text += "*" + (i + 1) + ".* " + t(chatId, "inbox_from") + ": " + from + "\n   " + t(chatId, "inbox_subject") + ": *" + subject + "*" + (date ? "\n   📅 " + date : "") + "\n   👉 /readmail " + (i + 1) + "\n\n";
      });

      await bot.editMessageText(text, {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "🔄 Refresh Inbox", callback_data: "check_inbox" }]
          ]
        }
      });
    } catch (err) {
      bot.sendMessage(chatId, t(chatId, "error") + ": " + err.message);
    }
  }
});

// ─── /yt & /ytdl Command (YouTube Downloader) ───────────────────

const YT_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|v\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

async function handleYouTubeDownload(chatId, userId, urlArg) {
  trackUsage(userId, "/yt");

  if (!urlArg || !YT_REGEX.test(urlArg)) {
    return bot.sendMessage(chatId, t(chatId, "yt_noUrl"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "yt_fetching"), { parse_mode: "Markdown" });

  try {
    const apiUrl = "https://apis.davidcyril.name.ng/download/savetube?url=" + encodeURIComponent(urlArg.trim());
    const data = await fetchJSON(apiUrl);

    if (!data || (!data.success && !data.result && !data.data)) {
      throw new Error(data?.error || data?.message || "Failed to extract YouTube video download link. Check URL.");
    }

    const videoData = data.data || data.result || {};
    const downloadUrl = videoData.download_url || videoData.url || "";
    const title = videoData.title || "YouTube Video";
    const quality = videoData.quality
      ? (String(videoData.quality).toLowerCase().endsWith("p")
          ? videoData.quality
          : videoData.quality + "p")
      : "720p";
    const duration = videoData.duration || "";
    const cover = videoData.cover || videoData.thumbnail || "";

    if (!downloadUrl) {
      throw new Error("No download stream URL returned from YouTube API.");
    }

    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    const caption = "🎥 *" + title + "*\n\n📊 *Quality:* " + quality + (duration ? "\n⏱️ *Duration:* " + duration : "") + "\n⚡ *Downloaded via @ascloudsbot*";

    const replyMarkup = {
      inline_keyboard: [
        [{ text: "⬇️ Download HD Video (" + quality + ")", url: downloadUrl }],
        [{ text: "🌐 Open in AS Cloud", url: "https://ascloud.vercel.app/ytdl" }]
      ]
    };

    try {
      await bot.sendVideo(chatId, downloadUrl, {
        caption,
        parse_mode: "Markdown",
        reply_markup: replyMarkup,
      });
    } catch (sendErr) {
      if (cover) {
        await bot.sendPhoto(chatId, cover, {
          caption: caption + "\n\n[⬇️ Click here to Download (" + quality + ")](" + downloadUrl + ")",
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });
      } else {
        await bot.sendMessage(chatId, caption + "\n\n[⬇️ Click here to Download (" + quality + ")](" + downloadUrl + ")", {
          parse_mode: "Markdown",
          disable_web_page_preview: false,
          reply_markup: replyMarkup,
        });
      }
    }
  } catch (err) {
    await bot.editMessageText(t(chatId, "yt_fail") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

bot.onText(/\/(?:yt|ytdl)(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const urlArg = (match[1] || "").trim();
  await handleYouTubeDownload(chatId, msg.from.id, urlArg);
});

// ─── /ai Command (Claude Haiku) ─────────────────────────────────

bot.onText(/\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/ai");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "thinking_haiku"), { parse_mode: "Markdown" });

  try {
    const url = "https://apis.davidcyril.name.ng/ai/claude-haiku-4.5?prompt=" + encodeURIComponent(prompt);
    const data = await fetchJSON(url);
    const reply = data.data || data.result || data.response || data.message || "No response received.";

    await bot.editMessageText("🤖 *Claude 4.5 Haiku*\n\n" + reply, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /opus Command (Claude Opus) ────────────────────────────────

bot.onText(/\/opus (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/opus");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "thinking_opus"), { parse_mode: "Markdown" });

  try {
    const url = "https://apis.davidcyril.name.ng/ai/claude-opus-4.8?prompt=" + encodeURIComponent(prompt);
    const data = await fetchJSON(url);
    const reply = data.data || data.result || data.response || data.message || "No response received.";

    await bot.editMessageText("🧠 *Claude 4.8 Opus*\n\n" + reply, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /insta Command (Instagram Download) ────────────────────────

bot.onText(/\/insta(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const urlArg = (match[1] || "").trim();
  trackUsage(msg.from.id, "/insta");

  if (!urlArg || !urlArg.includes("instagram.com")) {
    return bot.sendMessage(chatId, t(chatId, "insta_noUrl"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "insta_fetching"), { parse_mode: "Markdown" });

  try {
    const apiUrl = "https://apis.davidcyril.name.ng/instagram?url=" + encodeURIComponent(urlArg);
    const data = await fetchJSON(apiUrl);

    if (!data.success || !data.result) {
      throw new Error(data.message || "Failed to fetch. Make sure the reel/post is public.");
    }

    const result = data.result;
    const videoUrl = result.video || result.url || null;
    const thumbnail = result.thumbnail || null;
    const title = result.title || result.caption || "Instagram Reel";

    await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});

    if (videoUrl) {
      try {
        await bot.sendVideo(chatId, videoUrl, {
          caption: "📸 *Instagram Download*\n\n" + title,
          parse_mode: "Markdown",
        });
      } catch {
        await bot.sendMessage(chatId, "📸 *Instagram Download*\n\n🎬 *" + title + "*\n\n[⬇️ Download Video](" + videoUrl + ")", {
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        });
      }
    } else if (thumbnail) {
      await bot.sendPhoto(chatId, thumbnail, {
        caption: "📸 *Instagram*\n\n" + title,
        parse_mode: "Markdown",
      });
    } else {
      await bot.sendMessage(chatId, "📸 *Instagram*\n\n" + title + "\n\n_No downloadable media found._", { parse_mode: "Markdown" });
    }
  } catch (err) {
    await bot.editMessageText(t(chatId, "insta_fail") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /tempmail Command (Guerrilla Mail API) ─────────────────────

bot.onText(/\/tempmail/, async (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/tempmail");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "tempmail_generating"), { parse_mode: "Markdown" });

  try {
    const res = await fetchJSON("https://api.guerrillamail.com/ajax.php?f=get_email_address");
    if (!res || !res.email_addr || !res.sid_token) {
      throw new Error("Failed to obtain disposable email from server.");
    }

    const email = res.email_addr;
    const sidToken = res.sid_token;

    tempMailState[chatId] = { email, sidToken, messages: [] };

    const inboxRes = await fetchJSON("https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=" + encodeURIComponent(sidToken));
    if (inboxRes && Array.isArray(inboxRes.list)) {
      tempMailState[chatId].messages = inboxRes.list;
    }

    await bot.editMessageText(
      t(chatId, "tempmail_created") + "\n\n" + t(chatId, "tempmail_address") + ": `" + email + "`\n\n" + t(chatId, "tempmail_tip"),
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [{ text: "📬 Check Inbox (/inbox)", callback_data: "check_inbox" }],
            [{ text: "🌐 Open TempMail Web", url: "https://ascloud.vercel.app/tempmail" }]
          ]
        }
      }
    );
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /inbox Command ─────────────────────────────────────────────

bot.onText(/\/inbox/, async (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/inbox");

  const state = tempMailState[chatId];
  if (!state || !state.sidToken) {
    return bot.sendMessage(chatId, t(chatId, "tempmail_noAccount"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "inbox_checking"), { parse_mode: "Markdown" });

  try {
    const res = await fetchJSON("https://api.guerrillamail.com/ajax.php?f=check_email&seq=0&sid_token=" + encodeURIComponent(state.sidToken));
    const messages = (res && Array.isArray(res.list)) ? res.list : [];
    state.messages = messages;

    if (messages.length === 0) {
      await bot.editMessageText(
        "📬 *" + state.email + "*\n\n" + t(chatId, "inbox_empty"),
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔄 Refresh Inbox", callback_data: "check_inbox" }]
            ]
          }
        }
      );
      return;
    }

    let text = "📬 *Inbox for* `" + state.email + "` (" + messages.length + ")\n\n";
    messages.slice(0, 10).forEach((m, i) => {
      const from = m.mail_from || "Unknown";
      const subject = m.mail_subject || "(No subject)";
      const date = m.mail_date || "";
      text += "*" + (i + 1) + ".* " + t(chatId, "inbox_from") + ": " + from + "\n   " + t(chatId, "inbox_subject") + ": *" + subject + "*" + (date ? "\n   📅 " + date : "") + "\n   👉 /readmail " + (i + 1) + "\n\n";
    });

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔄 Refresh Inbox", callback_data: "check_inbox" }]
        ]
      }
    });
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /readmail Command ──────────────────────────────────────────

bot.onText(/\/readmail(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const numStr = (match[1] || "").trim();
  trackUsage(msg.from.id, "/readmail");

  const state = tempMailState[chatId];
  if (!state || !state.sidToken) {
    return bot.sendMessage(chatId, t(chatId, "tempmail_noAccount"), { parse_mode: "Markdown" });
  }

  if (!numStr || isNaN(numStr)) {
    return bot.sendMessage(chatId, t(chatId, "readmail_noNum"), { parse_mode: "Markdown" });
  }

  const idx = parseInt(numStr) - 1;
  if (!state.messages || !state.messages[idx]) {
    return bot.sendMessage(chatId, t(chatId, "readmail_notFound"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "readmail_reading"), { parse_mode: "Markdown" });

  try {
    const targetMail = state.messages[idx];
    const mailId = targetMail.mail_id;

    const res = await fetchJSON("https://api.guerrillamail.com/ajax.php?f=fetch_email&email_id=" + encodeURIComponent(mailId) + "&sid_token=" + encodeURIComponent(state.sidToken));

    const from = res.mail_from || targetMail.mail_from || "Unknown";
    const subject = res.mail_subject || targetMail.mail_subject || "(No subject)";
    const rawBody = res.mail_body || res.mail_excerpt || targetMail.mail_excerpt || "(Empty)";
    const body = stripHtml(rawBody);
    const date = res.mail_date || targetMail.mail_date || "";

    let text = "📖 *Email #" + (idx + 1) + "*\n\n";
    text += t(chatId, "inbox_from") + ": " + from + "\n";
    text += t(chatId, "inbox_subject") + ": *" + subject + "*\n";
    if (date) text += "📅 " + date + "\n";
    text += "\n" + body;

    if (text.length > 4000) text = text.substring(0, 3990) + "\n\n_...(truncated)_";

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /shorten Command ───────────────────────────────────────────

bot.onText(/\/shorten(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = (match[1] || "").trim().split(/\s+/);
  trackUsage(msg.from.id, "/shorten");

  if (args.length < 2 || !args[0] || !args[1]) {
    return bot.sendMessage(chatId, t(chatId, "shorten_usage"), { parse_mode: "Markdown" });
  }

  const slug = args[0];
  const url = args[1];

  if (!url.startsWith("http")) {
    return bot.sendMessage(chatId, t(chatId, "shorten_usage"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "shorten_creating"), { parse_mode: "Markdown" });

  try {
    const result = await createShortLink(slug, url, "tg_" + msg.from.id);
    if (result.success) {
      const shortUrl = "https://ascloud.vercel.app/" + slug;
      await bot.editMessageText(
        t(chatId, "shorten_success") + "\n\n" + t(chatId, "shorten_shortUrl") + ": `" + shortUrl + "`\n" + t(chatId, "shorten_original") + ": " + url,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }
      );
    } else {
      await bot.editMessageText(t(chatId, "error") + ": " + result.error, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /mylinks Command ───────────────────────────────────────────

bot.onText(/\/mylinks/, async (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/mylinks");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "mylinks_loading"), { parse_mode: "Markdown" });

  try {
    const links = await getUserLinks("tg_" + msg.from.id);
    if (links.length === 0) {
      await bot.editMessageText(t(chatId, "mylinks_empty"), {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      });
      return;
    }

    let text = t(chatId, "mylinks_title") + " (" + links.length + ")\n\n";
    links.forEach((l, i) => {
      text += "*" + (i + 1) + ".* /" + l.slug + "\n   → " + l.url + "\n   📊 " + l.clicks + " clicks\n\n";
    });

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /send Command (Clipboard Send) ─────────────────────────────

bot.onText(/\/send (.+)/s, async (msg, match) => {
  const chatId = msg.chat.id;
  const text = match[1].trim();
  trackUsage(msg.from.id, "/send");

  if (!text) {
    return bot.sendMessage(chatId, t(chatId, "clipboard_noText"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "clipboard_saving"), { parse_mode: "Markdown" });

  try {
    const result = await clipboardSend(text);
    if (result.success) {
      await bot.editMessageText(
        t(chatId, "clipboard_sent") + "\n\n" + t(chatId, "clipboard_code") + ": `" + result.code + "`\n\n" + t(chatId, "clipboard_sentTip") + "\n_/receive " + result.code + "_",
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      await bot.editMessageText(t(chatId, "error") + ": " + result.error, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /receive Command (Clipboard Receive) ───────────────────────

bot.onText(/\/receive (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = match[1].trim();
  trackUsage(msg.from.id, "/receive");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "clipboard_looking"), { parse_mode: "Markdown" });

  try {
    const item = await clipboardReceive(code);
    if (!item) {
      await bot.editMessageText(t(chatId, "clipboard_notFound"), {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      });
      return;
    }

    let responseText = t(chatId, "clipboard_received") + "\n\n";
    if (item.text) responseText += t(chatId, "clipboard_text") + ":\n" + item.text + "\n\n";
    if (item.mediaUrl) responseText += t(chatId, "clipboard_media") + ": [Download](" + item.mediaUrl + ")\n\n";
    responseText += "_Code: `" + item.code + "` • " + new Date(item.createdAt).toLocaleString() + "_";

    await bot.editMessageText(responseText, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

    if (item.mediaUrl) {
      try {
        await bot.sendDocument(chatId, item.mediaUrl, {
          caption: item.fileName ? "📎 " + item.fileName : undefined,
        });
      } catch {}
    }
  } catch (err) {
    await bot.editMessageText(t(chatId, "error") + ": " + err.message, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── Auto-detect URLs sent directly in chat & Handle unknown commands ──

bot.on("message", async (msg) => {
  if (!msg.text) return;
  const text = msg.text.trim();
  const chatId = msg.chat.id;

  // Auto-detect YouTube links sent without command
  if (!text.startsWith("/") && YT_REGEX.test(text)) {
    return handleYouTubeDownload(chatId, msg.from.id, text);
  }

  // Auto-detect Instagram links sent without command
  if (!text.startsWith("/") && (text.includes("instagram.com/reel/") || text.includes("instagram.com/p/") || text.includes("instagram.com/tv/"))) {
    const waitMsg = await bot.sendMessage(chatId, t(chatId, "insta_fetching"), { parse_mode: "Markdown" });
    try {
      const apiUrl = "https://apis.davidcyril.name.ng/instagram?url=" + encodeURIComponent(text);
      const data = await fetchJSON(apiUrl);
      if (data.success && data.result) {
        const result = data.result;
        const videoUrl = result.video || result.url || null;
        const thumbnail = result.thumbnail || null;
        const title = result.title || result.caption || "Instagram Reel";
        await bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
        if (videoUrl) {
          try {
            await bot.sendVideo(chatId, videoUrl, {
              caption: "📸 *Instagram Download*\n\n" + title,
              parse_mode: "Markdown",
            });
          } catch {
            await bot.sendMessage(chatId, "📸 *Instagram Download*\n\n🎬 *" + title + "*\n\n[⬇️ Download Video](" + videoUrl + ")", {
              parse_mode: "Markdown",
              disable_web_page_preview: false,
            });
          }
        }
        return;
      }
    } catch {}
  }

  // Handle unknown commands
  if (text.startsWith("/")) {
    const knownCmds = ["/start", "/help", "/lang", "/yt", "/ytdl", "/ai", "/opus", "/insta", "/tempmail", "/inbox", "/readmail", "/shorten", "/mylinks", "/send", "/receive"];
    const cmd = text.split(" ")[0].split("@")[0].toLowerCase();
    if (knownCmds.includes(cmd)) return;

    bot.sendMessage(msg.chat.id, t(msg.chat.id, "unknownCmd"), { parse_mode: "Markdown" });
  }
});

// ─── Error handling ─────────────────────────────────────────────

bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

console.log("✅ Bot initialized with EN/KO language support. Listening...");
