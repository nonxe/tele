const TelegramBot = require("node-telegram-bot-api");
const https = require("https");
const http = require("http");

// ─── Config ─────────────────────────────────────────────────────
const BOT_TOKEN = process.env.BOT_TOKEN || "";
const GH_PAT = process.env.GH_PAT || "";
const TELEDB_REPO = "nonxe/teledb";
const TELEDB_FILE = "stats.json";
const TELEDB_FILES_FILE = "files.json";
const CROSSDEVICE_REPO = "nonxe/crossdevice";
const CROSSDEVICE_FILE = "clipboard.json";
const LINKS_REPO = "nonxe/link";
const LINKS_FILE = "links.txt";
const CLOUD_STORAGE_CHANNEL = process.env.CLOUD_CHANNEL_ID || "-1003909259657";

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

📁 *Cloud File Storage*
/upload — Send or reply to any file/media with /upload to save to Cloud
/receive \`<code>\` — Retrieve any Cloud file or clipboard by 7-character code

🎬 *YouTube Downloader*
/yt \`<url>\` — Download YouTube videos in MP4 HD

📸 *Instagram*
/insta \`<url>\` — Download Instagram Reels & videos

🤖 *AI Chat*
/ai \`<prompt>\` — Claude 4.5 Haiku (fast)
/opus \`<prompt>\` — Claude 4.8 Opus (deep reasoning)

📧 *Temp Mail*
/tempmail — Generate a temporary email
/inbox — Check your inbox
/readmail \`<number>\` — Read a specific email

🔗 *Link Shortener*
/shorten \`<slug>\` \`<url>\` — Create a short link
/mylinks — View your short links

📋 *Cross-Device Clipboard*
/send \`<text>\` — Send text, get 7-character code

🌐 *Settings*
/lang — Change language (English / 한국어)
/help — Show this menu

_Powered by AS Cloud System_`,

    help: `☁️ *AS Cloud Bot — Help*

📁 /upload — Upload any file, photo, video, audio or document to Cloud
📥 /receive \`code\` — Retrieve Cloud file or clipboard by 7-char code
🎬 /yt \`url\` — Download YouTube HD MP4 video
📸 /insta \`url\` — Download Instagram Reel
🤖 /ai \`prompt\` — Ask Claude Haiku
🧠 /opus \`prompt\` — Ask Claude Opus
📧 /tempmail — Generate temp email
📬 /inbox — Check inbox
📖 /readmail \`N\` — Read email #N
🔗 /shorten \`slug\` \`url\` — Create short link
📋 /send \`text\` — Clipboard send
🌐 /lang — Switch language

_No limits. High speed Cloud._`,

    langChanged: "✅ Language set to *English*.",
    langPrompt: "🌐 Choose your language:",
    thinking_haiku: "🤖 _Thinking with Claude 4.5 Haiku..._",
    thinking_opus: "🧠 _Thinking with Claude 4.8 Opus..._",
    yt_fetching: "🎬 _Fetching YouTube video download link..._",
    yt_noUrl: "❌ Please provide a YouTube video URL.\n\nUsage: `/yt https://youtube.com/watch?v=...`",
    yt_fail: "❌ YouTube download failed",
    yt_caption: "🎬 *YouTube Video*\n\n📌 *{TITLE}*\n🎞 *Quality:* {QUALITY}\n⏱ *Duration:* {DURATION}\n\n[⬇️ Direct Download Link]({URL})",
    yt_btnDownload: "⬇️ Download MP4",
    insta_fetching: "📸 _Fetching Instagram content..._",
    insta_noUrl: "❌ Please provide an Instagram URL.\n\nUsage: `/insta https://instagram.com/reel/...`",
    insta_fail: "❌ Instagram download failed",
    tempmail_generating: "📧 _Generating temporary email..._",
    tempmail_created: "📧 *Temporary Email Created!*",
    tempmail_address: "📬 Address",
    tempmail_password: "🔑 Password",
    tempmail_tip: "_Emails will arrive here. Use /inbox to check._",
    tempmail_noAccount: "❌ No temp mail account. Use /tempmail to create one.",
    inbox_checking: "📬 _Checking inbox..._",
    inbox_empty: "📭 *Inbox is empty.*\n\n_New emails will appear here. Use /inbox to refresh._",
    inbox_title: "📬 *Inbox*",
    inbox_from: "From",
    inbox_subject: "Subject",
    readmail_reading: "📖 _Loading email..._",
    readmail_noNum: "❌ Please specify email number.\n\nUsage: `/readmail 1`",
    readmail_notFound: "❌ Email not found. Use /inbox to see available emails.",
    shorten_creating: "🔗 _Creating short link..._",
    shorten_usage: "❌ Usage: `/shorten myslug https://example.com`",
    shorten_success: "🔗 *Link Created!*",
    shorten_shortUrl: "Short URL",
    shorten_original: "Target",
    mylinks_loading: "🔗 _Loading your links..._",
    mylinks_empty: "📭 You haven't created any short links yet.\n\nUse `/shorten slug url` to create one.",
    mylinks_title: "🔗 *Your Short Links*",
    upload_saving: "☁️ _Syncing file to Cloud Storage..._",
    upload_success: "☁️ *Cloud Storage — File Uploaded!*",
    upload_code: "🔑 Access Code",
    upload_tip: "_Use this 7-character code to retrieve this file instantly on any device or account:_ \n`/receive `",
    upload_prompt: "ℹ️ *How to Upload to Cloud:*\n\n1. Send any document, photo, video, audio or file with `/upload` as caption.\n2. Or reply to any message containing media with `/upload`.\n\nYou will get an instant 7-character access code!",
    upload_fail: "❌ Failed to save file to Cloud Storage. Please try again.",
    clipboard_saving: "📋 _Saving to clipboard..._",
    clipboard_sent: "📋 *Clipboard — Sent!*",
    clipboard_code: "🔑 Your code",
    clipboard_sentTip: "_Use this 7-character code on any device to receive your text._",
    clipboard_noText: "❌ Please provide text to send.\n\nUsage: `/send Hello World`",
    clipboard_looking: "☁️ _Retrieving from Cloud..._",
    clipboard_received: "📋 *Clipboard — Received!*",
    clipboard_text: "📝 Text",
    clipboard_media: "📎 Media",
    clipboard_notFound: "❌ No Cloud item found for code \`{CODE}\`.\n\n_Make sure you entered a valid 7-character code._",
    file_delivered: "☁️ *Cloud File Delivered!*",
    unknownCmd: "❓ Unknown command. Type /help to see available commands.",
    error: "❌ Error",
    visitCloud: "🌐 Visit AS Cloud",
  },

  ko: {
    welcome: `☁️ *AS 클라우드 서비스 봇*

환영합니다! 텔레그램에서 모든 클라우드 서비스를 이용하세요.

*사용 가능한 명령어:*

📁 *클라우드 파일 스토리지*
/upload — 파일/미디어와 함께 /upload를 전송하거나 답장하여 클라우드에 저장
/receive \`<코드>\` — 7자리 코드로 클라우드 파일 또는 클립보드 수신

🎬 *유튜브 다운로더*
/yt \`<URL>\` — 유튜브 고화질 MP4 비디오 다운로드

📸 *인스타그램*
/insta \`<URL>\` — 인스타그램 릴스 & 영상 다운로드

🤖 *AI 채팅*
/ai \`<질문>\` — Claude 4.5 Haiku (빠른 응답)
/opus \`<질문>\` — Claude 4.8 Opus (심층 추론)

📧 *임시 메일*
/tempmail — 임시 이메일 생성
/inbox — 받은편지함 확인
/readmail \`<번호>\` — 특정 이메일 읽기

🔗 *링크 단축*
/shorten \`<슬러그>\` \`<URL>\` — 단축 링크 생성
/mylinks — 내 단축 링크 보기

📋 *크로스 디바이스 클립보드*
/send \`<텍스트>\` — 텍스트 전송, 7자리 코드 받기

🌐 *설정*
/lang — 언어 변경 (English / 한국어)
/help — 이 메뉴 보기

_AS Cloud System 제공_`,

    help: `☁️ *AS Cloud 봇 — 도움말*

📁 /upload — 모든 파일, 사진, 영상, 음성을 클라우드에 업로드
📥 /receive \`코드\` — 7자리 코드로 파일/클립보드 수신
🎬 /yt \`URL\` — 유튜브 고화질 MP4 비디오 다운로드
📸 /insta \`URL\` — 인스타그램 릴스 다운로드
🤖 /ai \`질문\` — Claude Haiku에게 질문
🧠 /opus \`질문\` — Claude Opus에게 질문
📧 /tempmail — 임시 이메일 생성
📬 /inbox — 받은편지함 확인
📖 /readmail \`N\` — N번 이메일 읽기
🔗 /shorten \`슬러그\` \`URL\` — 단축 링크 생성
📋 /send \`텍스트\` — 클립보드 전송
🌐 /lang — 언어 전환

_제한 없음. 초고속 클라우드._`,

    langChanged: "✅ 언어가 *한국어*로 설정되었습니다.",
    langPrompt: "🌐 언어를 선택하세요:",
    thinking_haiku: "🤖 _Claude 4.5 Haiku로 생각 중..._",
    thinking_opus: "🧠 _Claude 4.8 Opus로 생각 중..._",
    yt_fetching: "🎬 _유튜브 비디오 다운로드 링크 가져오는 중..._",
    yt_noUrl: "❌ 유튜브 비디오 URL을 입력하세요.\n\n사용법: `/yt https://youtube.com/watch?v=...`",
    yt_fail: "❌ 유튜브 다운로드 실패",
    yt_caption: "🎬 *유튜브 비디오*\n\n📌 *{TITLE}*\n🎞 *화질:* {QUALITY}\n⏱ *재생 시간:* {DURATION}\n\n[⬇️ 직접 다운로드 링크]({URL})",
    yt_btnDownload: "⬇️ MP4 다운로드",
    insta_fetching: "📸 _인스타그램 콘텐츠 가져오는 중..._",
    insta_noUrl: "❌ 인스타그램 URL을 입력하세요.\n\n사용법: `/insta https://instagram.com/reel/...`",
    insta_fail: "❌ 인스타그램 다운로드 실패",
    tempmail_generating: "📧 _임시 이메일 생성 중..._",
    tempmail_created: "📧 *임시 이메일 생성 완료!*",
    tempmail_address: "📬 주소",
    tempmail_password: "🔑 비밀번호",
    tempmail_tip: "_이메일이 여기로 도착합니다. /inbox로 확인하세요._",
    tempmail_noAccount: "❌ 임시 메일 계정이 없습니다. /tempmail로 생성하세요.",
    inbox_checking: "📬 _받은편지함 확인 중..._",
    inbox_empty: "📭 *받은편지함이 비어있습니다.*\n\n_새 이메일이 여기에 표시됩니다. /inbox로 새로고침하세요._",
    inbox_title: "📬 *받은편지함*",
    inbox_from: "보낸이",
    inbox_subject: "제목",
    readmail_reading: "📖 _이메일 로딩 중..._",
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
    upload_saving: "☁️ _클라우드 스토리지에 파일 동기화 중..._",
    upload_success: "☁️ *클라우드 스토리지 — 파일 업로드 완료!*",
    upload_code: "🔑 접근 코드",
    upload_tip: "_어느 기기나 계정에서든 이 7자리 코드로 즉시 파일을 가져올 수 있습니다:_ \n`/receive `",
    upload_prompt: "ℹ️ *클라우드 업로드 방법:*\n\n1. 파일, 사진, 영상, 문서 전송 시 캡션에 `/upload`를 입력하세요.\n2. 또는 이미 보낸 미디어 메시지에 `/upload`로 답장하세요.\n\n즉시 7자리 접근 코드가 발급됩니다!",
    upload_fail: "❌ 클라우드 스토리지 저장에 실패했습니다. 다시 시도해 주세요.",
    clipboard_saving: "📋 _클립보드에 저장 중..._",
    clipboard_sent: "📋 *클립보드 — 전송 완료!*",
    clipboard_code: "🔑 코드",
    clipboard_sentTip: "_이 7자리 코드를 다른 기기에서 사용하여 텍스트를 받으세요._",
    clipboard_noText: "❌ 전송할 텍스트를 입력하세요.\n\n사용법: `/send 안녕하세요`",
    clipboard_looking: "☁️ _클라우드에서 확인 중..._",
    clipboard_received: "📋 *클립보드 — 수신 완료!*",
    clipboard_text: "📝 텍스트",
    clipboard_media: "📎 미디어",
    clipboard_notFound: "❌ 코드 \`{CODE}\`에 해당하는 클라우드 항목이 없습니다.\n\n_유효한 7자리 코드를 입력했는지 확인하세요._",
    file_delivered: "☁️ *클라우드 파일 전달 완료!*",
    unknownCmd: "❓ 알 수 없는 명령어입니다. /help를 입력하여 사용 가능한 명령어를 확인하세요.",
    error: "❌ 오류",
    visitCloud: "🌐 AS Cloud 방문",
  },
};

function t(chatId, key, replacements = {}) {
  const lang = userLang[chatId] || "en";
  let str = LANG[lang][key] || LANG.en[key] || key;
  for (const [k, v] of Object.entries(replacements)) {
    str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return str;
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

function githubAPI(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.github.com",
      path,
      method,
      headers: {
        "Authorization": `token ${GH_PAT}`,
        "User-Agent": "ASCloud-TeleBot",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
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
    const path = `/repos/${TELEDB_REPO}/contents/${TELEDB_FILE}`;
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
      message: `Update stats: ${command} by ${userId}`,
      content: Buffer.from(JSON.stringify(stats, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;
    await githubAPI("PUT", path, body);
  } catch (e) {
    console.warn("Stats tracking error:", e.message);
  }
}

// ─── Cloud File Storage (Private Channel Sync) ──────────────────

function generate7CharCode(existingCodes = []) {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let code = "";
  for (let attempt = 0; attempt < 15; attempt++) {
    code = "";
    for (let i = 0; i < 7; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!existingCodes.includes(code.toUpperCase())) {
      return code.toUpperCase();
    }
  }
  return Math.floor(1000000 + Math.random() * 9000000).toString();
}

async function fetchCloudFiles() {
  if (!GH_PAT) return { sha: null, files: [] };
  try {
    const path = `/repos/${TELEDB_REPO}/contents/${TELEDB_FILES_FILE}`;
    const res = await githubAPI("GET", path);
    if (res.status !== 200 || !res.data.content) return { sha: null, files: [] };
    const sha = res.data.sha || null;
    const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
    let files = [];
    try { files = JSON.parse(decoded); if (!Array.isArray(files)) files = []; } catch { files = []; }
    return { sha, files };
  } catch (e) {
    return { sha: null, files: [] };
  }
}

async function saveCloudFileRecord(record) {
  if (!GH_PAT) return { success: false, error: "Database PAT not configured" };
  try {
    const path = `/repos/${TELEDB_REPO}/contents/${TELEDB_FILES_FILE}`;
    const { sha, files } = await fetchCloudFiles();

    const updated = [record, ...files].slice(0, 1000);

    const body = {
      message: `Add Cloud file ${record.code}`,
      content: Buffer.from(JSON.stringify(updated, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) {
      return { success: true, code: record.code };
    }
    return { success: false, error: `Database error (${putRes.status})` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getCloudFileByCode(code) {
  const clean = code.trim().toUpperCase();
  if (!clean || clean.length < 5) return null;
  const { files } = await fetchCloudFiles();
  return files.find((f) => f.code.toUpperCase() === clean) || null;
}

// Handler for uploading a message (file, document, photo, video, etc.) to Cloud Storage
async function handleCloudUpload(msg, targetMsg) {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/upload");

  const sourceMsg = targetMsg || msg;
  const fromChatId = sourceMsg.chat.id;
  const messageId = sourceMsg.message_id;

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "upload_saving"), { parse_mode: "Markdown" });

  try {
    let copiedMsg;
    try {
      copiedMsg = await bot.copyMessage(CLOUD_STORAGE_CHANNEL, fromChatId, messageId);
    } catch (copyErr) {
      copiedMsg = await bot.forwardMessage(CLOUD_STORAGE_CHANNEL, fromChatId, messageId);
    }

    const channelMessageId = copiedMsg.message_id;

    let mediaType = "message";
    let fileName = null;
    let fileSize = null;

    if (sourceMsg.document) {
      mediaType = "document";
      fileName = sourceMsg.document.file_name || "file";
      fileSize = sourceMsg.document.file_size;
    } else if (sourceMsg.photo) {
      mediaType = "photo";
      fileName = "photo.jpg";
    } else if (sourceMsg.video) {
      mediaType = "video";
      fileName = sourceMsg.video.file_name || "video.mp4";
      fileSize = sourceMsg.video.file_size;
    } else if (sourceMsg.audio) {
      mediaType = "audio";
      fileName = sourceMsg.audio.file_name || "audio.mp3";
      fileSize = sourceMsg.audio.file_size;
    } else if (sourceMsg.voice) {
      mediaType = "voice";
      fileName = "voice.ogg";
    } else if (sourceMsg.video_note) {
      mediaType = "video_note";
    } else if (sourceMsg.animation) {
      mediaType = "animation";
      fileName = sourceMsg.animation.file_name || "animation.gif";
    } else if (sourceMsg.sticker) {
      mediaType = "sticker";
    } else if (sourceMsg.text) {
      mediaType = "text";
    }

    const caption = sourceMsg.caption || sourceMsg.text || "";

    const { files } = await fetchCloudFiles();
    const existingCodes = files.map((f) => (f.code || "").toUpperCase());
    const code = generate7CharCode(existingCodes);

    const record = {
      code,
      channelId: CLOUD_STORAGE_CHANNEL,
      channelMessageId,
      mediaType,
      fileName,
      fileSize,
      caption: caption && !caption.startsWith("/upload") ? caption : "",
      fromUserId: msg.from.id,
      createdAt: new Date().toISOString(),
    };

    const saveResult = await saveCloudFileRecord(record);
    if (!saveResult.success) {
      throw new Error(saveResult.error || "Failed to save record");
    }

    const replyText = `${t(chatId, "upload_success")}\n\n${t(chatId, "upload_code")}: \`${code}\`\n\n${t(chatId, "upload_tip")}\`${code}\``;

    await bot.editMessageText(replyText, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    console.error("Upload error:", err);
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message || t(chatId, "upload_fail")}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
}

// ─── Cross-Device Clipboard Functions ───────────────────────────

async function clipboardSend(text) {
  if (!GH_PAT) return { success: false, error: "GitHub PAT not configured" };
  try {
    const path = `/repos/${CROSSDEVICE_REPO}/contents/${CROSSDEVICE_FILE}`;
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
      message: `Add clipboard item ${code} via Telegram`,
      content: Buffer.from(JSON.stringify(items, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) return { success: true, code };
    return { success: false, error: `GitHub API error (${putRes.status})` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function clipboardReceive(code) {
  if (!GH_PAT) return null;
  const cleanCode = code.trim().replace(/\D/g, "");
  if (!cleanCode || cleanCode.length !== 7) return null;
  try {
    const path = `/repos/${CROSSDEVICE_REPO}/contents/${CROSSDEVICE_FILE}`;
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
    const path = `/repos/${LINKS_REPO}/contents/${LINKS_FILE}`;
    const res = await githubAPI("GET", path);
    let sha = null;
    let links = [];

    if (res.status === 200 && res.data.content) {
      sha = res.data.sha;
      const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
      try { links = JSON.parse(decoded); if (!Array.isArray(links)) links = []; } catch { links = []; }
    }

    if (links.some((l) => l.slug.toLowerCase() === slug.toLowerCase())) {
      return { success: false, error: `Slug "${slug}" already exists.` };
    }

    const newLink = { slug, url, createdBy, createdAt: new Date().toISOString(), clicks: 0 };
    links.push(newLink);

    const body = {
      message: `Add short link /${slug} via Telegram`,
      content: Buffer.from(JSON.stringify(links, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) return { success: true, link: newLink };
    return { success: false, error: `GitHub API error (${putRes.status})` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function getUserLinks(userId) {
  if (!GH_PAT) return [];
  try {
    const path = `/repos/${LINKS_REPO}/contents/${LINKS_FILE}`;
    const res = await githubAPI("GET", path);
    if (res.status !== 200 || !res.data.content) return [];
    const decoded = Buffer.from(res.data.content, "base64").toString("utf-8");
    let links = [];
    try { links = JSON.parse(decoded); } catch { return []; }
    return links.filter((l) => l.createdBy === userId);
  } catch { return []; }
}

// ─── Temp Mail State ────────────────────────────────────────────

const tempMailState = {}; // chatId -> { email, password, token, accountId, messages }

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

bot.on("callback_query", (query) => {
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
  }
});

// ─── /upload Command ────────────────────────────────────────────

bot.onText(/\/upload(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (msg.reply_to_message) {
    return handleCloudUpload(msg, msg.reply_to_message);
  }

  if (msg.document || msg.photo || msg.video || msg.audio || msg.voice || msg.video_note || msg.animation || msg.sticker) {
    return handleCloudUpload(msg, msg);
  }

  bot.sendMessage(chatId, t(chatId, "upload_prompt"), { parse_mode: "Markdown" });
});

// ─── /receive Command (Cloud Files & Clipboard) ─────────────────

bot.onText(/\/receive\s*(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const code = (match[1] || "").trim();
  trackUsage(msg.from.id, "/receive");

  if (!code) {
    return bot.sendMessage(chatId, "❌ Please specify a 7-character code.\n\nUsage: `/receive K9X2P7M`", { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "clipboard_looking"), { parse_mode: "Markdown" });

  try {
    const cloudFile = await getCloudFileByCode(code);
    if (cloudFile) {
      await bot.deleteMessage(chatId, waitMsg.message_id);

      try {
        await bot.copyMessage(chatId, cloudFile.channelId, cloudFile.channelMessageId);
      } catch (copyErr) {
        await bot.forwardMessage(chatId, cloudFile.channelId, cloudFile.channelMessageId);
      }

      await bot.sendMessage(chatId, `${t(chatId, "file_delivered")}\n_Code: \`${cloudFile.code}\` • ${new Date(cloudFile.createdAt).toLocaleDateString()}_`, {
        parse_mode: "Markdown",
      });
      return;
    }

    const clipItem = await clipboardReceive(code);
    if (clipItem) {
      let responseText = `${t(chatId, "clipboard_received")}\n\n`;
      if (clipItem.text) responseText += `${t(chatId, "clipboard_text")}:\n${clipItem.text}\n\n`;
      if (clipItem.mediaUrl) responseText += `${t(chatId, "clipboard_media")}: [Download](${clipItem.mediaUrl})\n\n`;
      responseText += `_Code: \`${clipItem.code}\` • ${new Date(clipItem.createdAt).toLocaleString()}_`;

      await bot.editMessageText(responseText, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      });

      if (clipItem.mediaUrl) {
        try {
          await bot.sendDocument(chatId, clipItem.mediaUrl, {
            caption: clipItem.fileName ? `📎 ${clipItem.fileName}` : undefined,
          });
        } catch {}
      }
      return;
    }

    await bot.editMessageText(t(chatId, "clipboard_notFound", { CODE: code }), {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /yt Command (YouTube Downloader with savetube API) ─────────

bot.onText(/\/(?:yt|ytdl)\s*(.*)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const urlArg = (match[1] || "").trim();
  trackUsage(msg.from.id, "/yt");

  if (!urlArg || (!urlArg.includes("youtube.com") && !urlArg.includes("youtu.be"))) {
    return bot.sendMessage(chatId, t(chatId, "yt_noUrl"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "yt_fetching"), { parse_mode: "Markdown" });

  try {
    const apiUrl = `https://apis.davidcyril.name.ng/download/savetube?url=${encodeURIComponent(urlArg)}`;
    const data = await fetchJSON(apiUrl);

    if (!data.success && !data.result && !data.data) {
      throw new Error(data.message || data.error || "Failed to download YouTube video.");
    }

    const videoData = data.data || data.result || {};
    const title = videoData.title || "YouTube Video";
    const downloadUrl = videoData.download_url || videoData.url || "";
    const quality = videoData.quality ? (String(videoData.quality).toLowerCase().endsWith("p") ? videoData.quality : `${videoData.quality}p`) : "720p";
    const duration = videoData.duration || "HD";
    const cover = videoData.cover || videoData.thumbnail || "";

    if (!downloadUrl) {
      throw new Error("Could not extract direct video download URL.");
    }

    const caption = t(chatId, "yt_caption", {
      TITLE: title,
      QUALITY: quality,
      DURATION: duration,
      URL: downloadUrl,
    });

    const replyMarkup = {
      inline_keyboard: [
        [{ text: t(chatId, "yt_btnDownload"), url: downloadUrl }],
      ],
    };

    await bot.deleteMessage(chatId, waitMsg.message_id);

    if (cover) {
      try {
        await bot.sendPhoto(chatId, cover, {
          caption,
          parse_mode: "Markdown",
          reply_markup: replyMarkup,
        });
        return;
      } catch (photoErr) {
        // Fallback to text message if photo sending fails
      }
    }

    await bot.sendMessage(chatId, caption, {
      parse_mode: "Markdown",
      disable_web_page_preview: false,
      reply_markup: replyMarkup,
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "yt_fail")}: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /ai Command (Claude Haiku) ─────────────────────────────────

bot.onText(/\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/ai");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "thinking_haiku"), { parse_mode: "Markdown" });

  try {
    const url = `https://apis.davidcyril.name.ng/ai/claude-haiku-4.5?prompt=${encodeURIComponent(prompt)}`;
    const data = await fetchJSON(url);
    const reply = data.data || data.result || data.response || data.message || "No response received.";

    await bot.editMessageText(`🤖 *Claude 4.5 Haiku*\n\n${reply}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
    const url = `https://apis.davidcyril.name.ng/ai/claude-opus-4.8?prompt=${encodeURIComponent(prompt)}`;
    const data = await fetchJSON(url);
    const reply = data.data || data.result || data.response || data.message || "No response received.";

    await bot.editMessageText(`🧠 *Claude 4.8 Opus*\n\n${reply}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
    const apiUrl = `https://apis.davidcyril.name.ng/instagram?url=${encodeURIComponent(urlArg)}`;
    const data = await fetchJSON(apiUrl);

    if (!data.success || !data.result) {
      throw new Error(data.message || "Failed to fetch. Make sure the reel/post is public.");
    }

    const result = data.result;
    const videoUrl = result.video || result.url || null;
    const thumbnail = result.thumbnail || null;
    const title = result.title || result.caption || "Instagram Reel";

    await bot.deleteMessage(chatId, waitMsg.message_id);

    if (videoUrl) {
      try {
        await bot.sendVideo(chatId, videoUrl, {
          caption: `📸 *Instagram Download*\n\n${title}`,
          parse_mode: "Markdown",
        });
      } catch {
        await bot.sendMessage(chatId, `📸 *Instagram Download*\n\n🎬 *${title}*\n\n[⬇️ Download Video](${videoUrl})`, {
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        });
      }
    } else if (thumbnail) {
      await bot.sendPhoto(chatId, thumbnail, {
        caption: `📸 *Instagram*\n\n${title}`,
        parse_mode: "Markdown",
      });
    } else {
      await bot.sendMessage(chatId, `📸 *Instagram*\n\n${title}\n\n_No downloadable media found._`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "insta_fail")}: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /tempmail Command ──────────────────────────────────────────

bot.onText(/\/tempmail/, async (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/tempmail");

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "tempmail_generating"), { parse_mode: "Markdown" });

  try {
    const domainRes = await fetchJSON("https://api.mail.tm/domains");
    const activeDomains = domainRes["hydra:member"]?.filter((d) => d.isActive);
    if (!activeDomains || activeDomains.length === 0) throw new Error("No active email domains.");

    const domain = activeDomains[0].domain;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let username = "cloud_";
    for (let i = 0; i < 8; i++) username += chars[Math.floor(Math.random() * chars.length)];
    const email = `${username}@${domain}`;

    let password = "";
    for (let i = 0; i < 12; i++) password += chars[Math.floor(Math.random() * chars.length)];

    const createRes = await fetchWithHeaders("https://api.mail.tm/accounts", {
      method: "POST",
      body: JSON.stringify({ address: email, password }),
    });

    if (createRes.status !== 201 && createRes.status !== 200) {
      throw new Error(createRes.data?.message || "Failed to create mail account.");
    }

    const accountId = createRes.data.id;

    const tokenRes = await fetchWithHeaders("https://api.mail.tm/token", {
      method: "POST",
      body: JSON.stringify({ address: email, password }),
    });

    if (tokenRes.status !== 200) throw new Error("Authentication failed.");
    const token = tokenRes.data.token;

    tempMailState[chatId] = { email, password, token, accountId, messages: [] };

    await bot.editMessageText(
      `${t(chatId, "tempmail_created")}\n\n${t(chatId, "tempmail_address")}: \`${email}\`\n${t(chatId, "tempmail_password")}: \`${password}\`\n\n${t(chatId, "tempmail_tip")}`,
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      }
    );
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
  if (!state || !state.token) {
    return bot.sendMessage(chatId, t(chatId, "tempmail_noAccount"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "inbox_checking"), { parse_mode: "Markdown" });

  try {
    const res = await fetchWithHeaders("https://api.mail.tm/messages", {
      headers: { "Authorization": `Bearer ${state.token}` },
    });

    const messages = res.data["hydra:member"] || [];
    state.messages = messages;

    if (messages.length === 0) {
      await bot.editMessageText(t(chatId, "inbox_empty"), {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      });
      return;
    }

    let text = `${t(chatId, "inbox_title")} (${messages.length})\n\n`;
    messages.forEach((m, i) => {
      const from = m.from?.address || "Unknown";
      const subject = m.subject || "(No subject)";
      text += `*${i + 1}.* ${t(chatId, "inbox_from")}: ${from}\n   ${t(chatId, "inbox_subject")}: ${subject}\n\n`;
    });
    text += `_Use /readmail <number> to read an email._`;

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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

  if (!numStr || isNaN(parseInt(numStr))) {
    return bot.sendMessage(chatId, t(chatId, "readmail_noNum"), { parse_mode: "Markdown" });
  }

  const state = tempMailState[chatId];
  if (!state || !state.token) {
    return bot.sendMessage(chatId, t(chatId, "tempmail_noAccount"), { parse_mode: "Markdown" });
  }

  const idx = parseInt(numStr) - 1;
  if (!state.messages || !state.messages[idx]) {
    return bot.sendMessage(chatId, t(chatId, "readmail_notFound"), { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, t(chatId, "readmail_reading"), { parse_mode: "Markdown" });

  try {
    const msgId = state.messages[idx].id;
    const res = await fetchWithHeaders(`https://api.mail.tm/messages/${msgId}`, {
      headers: { "Authorization": `Bearer ${state.token}` },
    });

    const mail = res.data;
    const from = mail.from?.address || "Unknown";
    const subject = mail.subject || "(No subject)";
    const body = mail.text || mail.intro || "(Empty)";
    const date = mail.createdAt ? new Date(mail.createdAt).toLocaleString() : "";

    let text = `📖 *Email #${idx + 1}*\n\n`;
    text += `${t(chatId, "inbox_from")}: ${from}\n`;
    text += `${t(chatId, "inbox_subject")}: *${subject}*\n`;
    if (date) text += `📅 ${date}\n`;
    text += `\n${body}`;

    if (text.length > 4000) text = text.substring(0, 3990) + "\n\n_...(truncated)_";

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
    const result = await createShortLink(slug, url, `tg_${msg.from.id}`);
    if (result.success) {
      const shortUrl = `https://ascloud.vercel.app/${slug}`;
      await bot.editMessageText(
        `${t(chatId, "shorten_success")}\n\n${t(chatId, "shorten_shortUrl")}: \`${shortUrl}\`\n${t(chatId, "shorten_original")}: ${url}`,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
          disable_web_page_preview: true,
        }
      );
    } else {
      await bot.editMessageText(`${t(chatId, "error")}: ${result.error}`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
    const links = await getUserLinks(`tg_${msg.from.id}`);
    if (links.length === 0) {
      await bot.editMessageText(t(chatId, "mylinks_empty"), {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      });
      return;
    }

    let text = `${t(chatId, "mylinks_title")} (${links.length})\n\n`;
    links.forEach((l, i) => {
      text += `*${i + 1}.* /${l.slug}\n   → ${l.url}\n   📊 ${l.clicks} clicks\n\n`;
    });

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
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
        `${t(chatId, "clipboard_sent")}\n\n${t(chatId, "clipboard_code")}: \`${result.code}\`\n\n${t(chatId, "clipboard_sentTip")}\n_/receive ${result.code}_`,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      await bot.editMessageText(`${t(chatId, "error")}: ${result.error}`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(`${t(chatId, "error")}: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── Generic Message Listener (Auto upload on media with caption /upload) ──

bot.on("message", async (msg) => {
  if (msg.caption && msg.caption.trim().toLowerCase().startsWith("/upload")) {
    return handleCloudUpload(msg, msg);
  }

  if (!msg.text || !msg.text.startsWith("/")) return;
  const knownCmds = [
    "/start", "/help", "/lang", "/upload", "/receive", "/get",
    "/yt", "/ytdl", "/insta", "/ai", "/opus", "/tempmail", "/inbox",
    "/readmail", "/shorten", "/mylinks", "/send"
  ];
  const cmd = msg.text.split(" ")[0].split("@")[0].toLowerCase();
  if (knownCmds.includes(cmd)) return;

  bot.sendMessage(msg.chat.id, t(msg.chat.id, "unknownCmd"), { parse_mode: "Markdown" });
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

console.log("✅ Bot initialized with YouTube (/yt), Cloud Storage, and EN/KO language support. Listening...");
