const KINDS = {
  report_damage: { prefix: "SCH", title: "Schadensmeldung" },
  request_appointment: { prefix: "TER", title: "Terminwunsch" },
  escalate_to_human: { prefix: "UEB", title: "Übergabe an Verwaltung" },
};

const CATEGORIES = ["heizung", "wasser", "elektrik", "fenster_tueren", "schimmel", "aufzug", "treppenhaus", "sonstiges"];
const URGENCIES = ["notfall", "hoch", "normal"];

const clip = (v) => String(v ?? "").slice(0, 1000);

export function newId(prefix) {
  const bytes = crypto.getRandomValues(new Uint8Array(3));
  return `${prefix}-${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

/** Prüft die Eingaben des Modells und liefert { id, subject, body } oder wirft einen Fehler. */
export function buildTicket(toolName, input) {
  const kind = KINDS[toolName];
  if (!kind) throw new Error(`Unbekanntes Tool: ${toolName}`);
  const data = Object.fromEntries(Object.entries(input ?? {}).map(([k, v]) => [k, clip(v)]));
  if (toolName === "report_damage") {
    if (!CATEGORIES.includes(data.category) || !URGENCIES.includes(data.urgency)) throw new Error("Ungültige Kategorie oder Dringlichkeit");
  }
  const id = newId(kind.prefix);
  const urgent = data.urgency === "notfall" ? "[NOTFALL] " : "";
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${v}`);
  return {
    id,
    subject: `${urgent}${kind.title} ${id}`,
    body: `${kind.title} ${id}\n\n${lines.join("\n")}\n\n(automatisch vom Mieter-Chatbot erstellt)`,
  };
}

/** Versendet das Ticket per E-Mail (Resend). Wirft bei Fehlern. */
export async function sendTicket(env, ticket) {
  console.log("TICKET", ticket.id, ticket.subject); // Backup im Worker-Log
  const res = await fetch(`${env.RESEND_BASE_URL || "https://api.resend.com"}/emails`, {
    method: "POST",
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: env.FROM_EMAIL || "Mieter-Chatbot <onboarding@resend.dev>",
      to: [env.NOTIFY_EMAIL],
      subject: ticket.subject,
      text: ticket.body,
    }),
  });
  if (!res.ok) throw new Error(`E-Mail-Versand fehlgeschlagen (${res.status})`);
}
