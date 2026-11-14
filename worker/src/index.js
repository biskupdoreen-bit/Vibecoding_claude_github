import { SYSTEM_PROMPT, TOOLS } from "./prompt.js";
import { buildTicket, sendTicket } from "./tickets.js";

export { Limiter } from "./limiter.js";

const MAX_MESSAGES = 20;
const MAX_CHARS = 2000;
const MAX_TOOL_ROUNDS = 5;

const FRIENDLY = {
  minute: "Bitte einen Moment warten und dann erneut senden.",
  day: "Sie haben heute viele Nachrichten gesendet. Bitte kontaktieren Sie die Verwaltung direkt.",
  global: "Der Assistent ist heute ausgelastet. Bitte kontaktieren Sie die Verwaltung direkt.",
};

function cors(env, origin) {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    vary: "origin",
  };
}

function json(env, origin, body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...cors(env, origin) } });
}

/** Nur schlichte Text-Nachrichten vom Browser zulassen – keine fremden Tool-Ergebnisse oder Rollen. */
export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES) return null;
  const out = [];
  for (const [i, m] of messages.entries()) {
    if (!m || typeof m.content !== "string" || m.content.length === 0 || m.content.length > MAX_CHARS) return null;
    const expected = i % 2 === 0 ? "user" : "assistant";
    if (m.role !== expected) return null;
    out.push({ role: m.role, content: m.content });
  }
  return out.at(-1).role === "user" ? out : null;
}

async function callClaude(env, messages) {
  const res = await fetch(`${env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: env.MODEL || "claude-opus-5-5", max_tokens: 4096, system: SYSTEM_PROMPT, tools: TOOLS, messages }),
  });
  if (!res.ok) {
    console.error("Anthropic-Fehler", res.status, await res.text());
    throw new Error("upstream");
  }
  return res.json();
}

async function runConversation(env, messages) {
  for (let i = 0; i < MAX_TOOL_ROUNDS; i++) {
    const res = await callClaude(env, messages);
    messages.push({ role: "assistant", content: res.content });
    if (res.stop_reason === "refusal") return "Dazu kann ich leider nichts sagen. Bitte wenden Sie sich an die Verwaltung.";
    if (res.stop_reason !== "tool_use") return res.content.filter((b) => b.type === "text").map((b) => b.text).join("");

    const results = [];
    for (const block of res.content.filter((b) => b.type === "tool_use")) {
      try {
        const ticket = buildTicket(block.name, block.input);
        await sendTicket(env, ticket);
        const text =
          block.name === "report_damage" ? `Schadensmeldung gespeichert, Ticketnummer ${ticket.id}.`
          : block.name === "request_appointment" ? `Terminwunsch gespeichert, Referenz ${ticket.id}. Bestätigung folgt durch die Verwaltung.`
          : `Übergabe an die Verwaltung erfolgt, Referenz ${ticket.id}.`;
        results.push({ type: "tool_result", tool_use_id: block.id, content: text });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: block.id, content: `Fehler: ${e.message}. Bitte den Mieter bitten, die Verwaltung direkt zu kontaktieren.`, is_error: true });
      }
    }
    messages.push({ role: "user", content: results });
  }
  return "Das hat leider nicht geklappt. Bitte kontaktieren Sie die Verwaltung.";
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("origin") ?? "";
    if (origin !== env.ALLOWED_ORIGIN) return new Response("Forbidden", { status: 403 });
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(env, origin) });
    if (request.method !== "POST") return json(env, origin, { error: "Method not allowed" }, 405);

    let body;
    try { body = await request.json(); } catch { return json(env, origin, { error: "Ungültige Anfrage." }, 400); }
    const messages = validateMessages(body?.messages);
    if (!messages) return json(env, origin, { error: "Ungültige Anfrage." }, 400);

    const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
    const limiter = env.LIMITER.get(env.LIMITER.idFromName("main"));
    const check = await (await limiter.fetch("https://limiter/", {
      method: "POST",
      body: JSON.stringify({
        ip,
        perMinute: Number(env.LIMIT_PER_MINUTE),
        perIpDay: Number(env.LIMIT_PER_IP_DAY),
        globalDay: Number(env.LIMIT_GLOBAL_DAY),
      }),
    })).json();
    if (!check.ok) return json(env, origin, { error: FRIENDLY[check.reason] }, 429);

    try {
      return json(env, origin, { reply: await runConversation(env, messages) });
    } catch {
      return json(env, origin, { error: "Der Assistent ist gerade nicht erreichbar." }, 502);
    }
  },
};
