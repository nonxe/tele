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

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is required. Set it as an environment variable.");
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
console.log("🤖 AS Cloud Bot is running...");

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

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    mod.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    }, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(data));
    }).on("error", reject);
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

// Resolve tmpfiles.org HTML page to direct download URL
async function resolveTmpfilesUrl(pageUrl) {
  if (!pageUrl || !pageUrl.startsWith("http")) return pageUrl;
  try {
    const html = await fetchText(pageUrl);
    // Match direct image link inside tmpfiles.org HTML page
    const imgMatch = html.match(/<img[^>]+src=["'](https?:\/\/[^"']*tmpfiles\.org\/dl\/[^"']+)["']/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];
    const anchorMatch = html.match(/<a[^>]+href=["'](https?:\/\/[^"']*tmpfiles\.org\/dl\/[^"']+)["']/i);
    if (anchorMatch && anchorMatch[1]) return anchorMatch[1];
  } catch (e) {
    console.warn("tmpfiles scrape failed:", e.message);
  }
  // Fallback: insert /dl/ if missing
  if (pageUrl.includes("tmpfiles.org/") && !pageUrl.includes("tmpfiles.org/dl/")) {
    return pageUrl.replace("tmpfiles.org/", "tmpfiles.org/dl/");
  }
  return pageUrl;
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

    // Generate unique 7-digit code
    let code = "";
    for (let i = 0; i < 10; i++) {
      const candidate = Math.floor(1000000 + Math.random() * 9000000).toString();
      if (!items.some((item) => item.code === candidate)) { code = candidate; break; }
    }
    if (!code) code = Math.floor(1000000 + Math.random() * 9000000).toString();

    const newItem = {
      code,
      type: "text",
      text,
      createdAt: new Date().toISOString(),
    };

    items = [newItem, ...items].slice(0, 200);

    const body = {
      message: `Add clipboard item ${code} via Telegram`,
      content: Buffer.from(JSON.stringify(items, null, 2)).toString("base64"),
    };
    if (sha) body.sha = sha;

    const putRes = await githubAPI("PUT", path, body);
    if (putRes.status === 200 || putRes.status === 201) {
      return { success: true, code };
    }
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
  } catch {
    return null;
  }
}

// ─── /start Command ─────────────────────────────────────────────

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/start");

  const welcomeText = `
☁️ *AS CLOUD SERVICES BOT*

Welcome! Access all Cloud services right here in Telegram.

*Available Commands:*

🤖 *AI Chat*
/ai \`<prompt>\` — Claude 4.5 Haiku (fast)
/opus \`<prompt>\` — Claude 4.8 Opus (deep reasoning)

🎨 *AI Image Generation*
/imagine \`<prompt>\` — Flux v2 (general)
/anime \`<prompt>\` — Animagine (anime style)
/realism \`<prompt>\` — Epic Realism (photorealistic)

📥 *YouTube Download*
/ytdl \`<url>\` — Get MP4 download link

📋 *Cross-Device Clipboard*
/send \`<text>\` — Send text, get 7-digit code
/receive \`<code>\` — Receive by 7-digit code

🌐 *More*
/help — Show this menu again

_Powered by AS Cloud System_
`;

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "🌐 Visit AS Cloud", url: "https://shs-cloud.vercel.app" }],
      ],
    },
  });
});

// ─── /help Command ──────────────────────────────────────────────

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;
  trackUsage(msg.from.id, "/help");

  bot.sendMessage(chatId, `
☁️ *AS Cloud Bot — Help*

🤖 /ai \`prompt\` — Ask Claude Haiku
🧠 /opus \`prompt\` — Ask Claude Opus
🎨 /imagine \`prompt\` — Generate image (Flux v2)
🌸 /anime \`prompt\` — Generate anime image
📸 /realism \`prompt\` — Generate realistic image
📥 /ytdl \`url\` — YouTube MP4 download
📋 /send \`text\` — Clipboard send
📋 /receive \`code\` — Clipboard receive

_No limits. No sign-ups. Just use._
`, { parse_mode: "Markdown" });
});

// ─── /ai Command (Claude Haiku) ─────────────────────────────────

bot.onText(/\/ai (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/ai");

  const waitMsg = await bot.sendMessage(chatId, "🤖 _Thinking with Claude 4.5 Haiku..._", { parse_mode: "Markdown" });

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
    await bot.editMessageText(`❌ Error: ${err.message}`, {
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

  const waitMsg = await bot.sendMessage(chatId, "🧠 _Thinking with Claude 4.8 Opus..._", { parse_mode: "Markdown" });

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
    await bot.editMessageText(`❌ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /imagine Command (Flux v2) ─────────────────────────────────

bot.onText(/\/imagine (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/imagine");

  const waitMsg = await bot.sendMessage(chatId, "🎨 _Generating image with Flux v2..._", { parse_mode: "Markdown" });

  try {
    const url = `https://apis.davidcyril.name.ng/fluxv2?prompt=${encodeURIComponent(prompt)}`;
    const data = await fetchJSON(url);
    const rawUrl = data.result || data.cdn_url || data.url || data.image || "";

    if (!rawUrl) throw new Error("No image URL received from API.");

    const directUrl = await resolveTmpfilesUrl(rawUrl);
    await bot.deleteMessage(chatId, waitMsg.message_id);
    await bot.sendPhoto(chatId, directUrl, {
      caption: `🎨 *Flux v2*\n\n_${prompt}_`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`❌ Image generation failed: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /anime Command (Animagine) ─────────────────────────────────

bot.onText(/\/anime (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/anime");

  const waitMsg = await bot.sendMessage(chatId, "🌸 _Generating anime image..._", { parse_mode: "Markdown" });

  try {
    const url = `https://apis.davidcyril.name.ng/animagine?prompt=${encodeURIComponent(prompt)}`;
    const data = await fetchJSON(url);
    const rawUrl = data.result || data.cdn_url || data.url || data.image || "";

    if (!rawUrl) throw new Error("No image URL received from API.");

    const directUrl = await resolveTmpfilesUrl(rawUrl);
    await bot.deleteMessage(chatId, waitMsg.message_id);
    await bot.sendPhoto(chatId, directUrl, {
      caption: `🌸 *Animagine*\n\n_${prompt}_`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`❌ Image generation failed: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /realism Command (Epic Realism) ────────────────────────────

bot.onText(/\/realism (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const prompt = match[1].trim();
  trackUsage(msg.from.id, "/realism");

  const waitMsg = await bot.sendMessage(chatId, "📸 _Generating photorealistic image..._", { parse_mode: "Markdown" });

  try {
    const url = `https://apis.davidcyril.name.ng/epicrealism?prompt=${encodeURIComponent(prompt)}`;
    const data = await fetchJSON(url);
    const rawUrl = data.result || data.cdn_url || data.url || data.image || "";

    if (!rawUrl) throw new Error("No image URL received from API.");

    const directUrl = await resolveTmpfilesUrl(rawUrl);
    await bot.deleteMessage(chatId, waitMsg.message_id);
    await bot.sendPhoto(chatId, directUrl, {
      caption: `📸 *Epic Realism*\n\n_${prompt}_`,
      parse_mode: "Markdown",
    });
  } catch (err) {
    await bot.editMessageText(`❌ Image generation failed: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── /ytdl Command (YouTube Download) ───────────────────────────

bot.onText(/\/ytdl (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const videoUrl = match[1].trim();
  trackUsage(msg.from.id, "/ytdl");

  const waitMsg = await bot.sendMessage(chatId, "📥 _Fetching YouTube download link..._", { parse_mode: "Markdown" });

  try {
    const url = `https://apis.davidcyril.name.ng/download/ytmp4?url=${encodeURIComponent(videoUrl)}`;
    const data = await fetchJSON(url);
    
    const downloadUrl = data.result || data.download_url || data.url || data.link || "";
    const title = data.title || "YouTube Video";

    if (!downloadUrl) throw new Error("Could not fetch download link.");

    await bot.editMessageText(
      `📥 *YouTube Download*\n\n🎬 *${title}*\n\n[⬇️ Download MP4](${downloadUrl})`,
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }
    );
  } catch (err) {
    await bot.editMessageText(`❌ YouTube download failed: ${err.message}`, {
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
    return bot.sendMessage(chatId, "❌ Please provide text to send.\n\nUsage: `/send Hello World`", { parse_mode: "Markdown" });
  }

  const waitMsg = await bot.sendMessage(chatId, "📋 _Saving to clipboard..._", { parse_mode: "Markdown" });

  try {
    const result = await clipboardSend(text);
    if (result.success) {
      await bot.editMessageText(
        `📋 *Clipboard — Sent!*\n\n🔑 Your code: \`${result.code}\`\n\n_Use this 7-digit code on any device to receive your text._\n_Share it or use_ /receive ${result.code}`,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: "Markdown",
        }
      );
    } else {
      await bot.editMessageText(`❌ Failed: ${result.error}`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
      });
    }
  } catch (err) {
    await bot.editMessageText(`❌ Error: ${err.message}`, {
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

  const waitMsg = await bot.sendMessage(chatId, "📋 _Looking up clipboard code..._", { parse_mode: "Markdown" });

  try {
    const item = await clipboardReceive(code);
    if (!item) {
      await bot.editMessageText(`❌ No clipboard entry found for code \`${code}\`.\n\n_Make sure you entered a valid 7-digit code._`, {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: "Markdown",
      });
      return;
    }

    let responseText = `📋 *Clipboard — Received!*\n\n`;
    if (item.text) responseText += `📝 *Text:*\n${item.text}\n\n`;
    if (item.mediaUrl) responseText += `📎 *Media:* [Download](${item.mediaUrl})\n\n`;
    responseText += `_Code: \`${item.code}\` • ${new Date(item.createdAt).toLocaleString()}_`;

    await bot.editMessageText(responseText, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
    });

    // If there's a media URL, also send it as a document
    if (item.mediaUrl) {
      try {
        await bot.sendDocument(chatId, item.mediaUrl, {
          caption: item.text ? `📎 ${item.fileName || "Media file"}` : undefined,
        });
      } catch {
        // Media send might fail for some URLs, text response is already sent
      }
    }
  } catch (err) {
    await bot.editMessageText(`❌ Error: ${err.message}`, {
      chat_id: chatId,
      message_id: waitMsg.message_id,
    });
  }
});

// ─── Handle unknown commands ────────────────────────────────────

bot.on("message", (msg) => {
  if (!msg.text || !msg.text.startsWith("/")) return;
  // Skip if already handled by other handlers
  const knownCmds = ["/start", "/help", "/ai", "/opus", "/imagine", "/anime", "/realism", "/ytdl", "/send", "/receive"];
  const cmd = msg.text.split(" ")[0].split("@")[0].toLowerCase();
  if (knownCmds.includes(cmd)) return;

  bot.sendMessage(msg.chat.id, `❓ Unknown command: \`${cmd}\`\n\nType /help to see available commands.`, {
    parse_mode: "Markdown",
  });
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

console.log("✅ Bot initialized. Listening for commands...");
