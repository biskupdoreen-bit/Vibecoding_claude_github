"""Tools, die der Chatbot aufrufen darf. Sie schreiben nur Tickets in eine Datei –
bewusst keine Rechte darüber hinaus (Schutz vor Prompt-Injection durch Mietertexte)."""
import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

DATA_FILE = Path(os.environ.get("TICKET_FILE", Path(__file__).parent.parent / "data" / "tickets.jsonl"))

CATEGORIES = ["heizung", "wasser", "elektrik", "fenster_tueren", "schimmel", "aufzug", "treppenhaus", "sonstiges"]
URGENCIES = ["notfall", "hoch", "normal"]

TOOLS = [
    {
        "name": "report_damage",
        "description": (
            "Erfasst eine Schadens- oder Reparaturmeldung, nachdem alle Pflichtangaben vom Mieter "
            "bekannt sind (Wohnung/Ort, Beschreibung, Kontaktmöglichkeit). Nicht bei Notfällen allein "
            "verwenden: bei Notfällen zuerst die Notfallnummer nennen."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "category": {"type": "string", "enum": CATEGORIES},
                "urgency": {"type": "string", "enum": URGENCIES},
                "location": {"type": "string", "description": "Adresse, Wohnung/Etage, Raum"},
                "description": {"type": "string"},
                "tenant_name": {"type": "string"},
                "contact": {"type": "string", "description": "Telefon oder E-Mail für Rückfragen"},
            },
            "required": ["category", "urgency", "location", "description", "tenant_name", "contact"],
        },
    },
    {
        "name": "request_appointment",
        "description": "Nimmt einen Terminwunsch auf (Handwerker, Zählerablesung, Besichtigung). Der Termin wird von der Verwaltung bestätigt.",
        "input_schema": {
            "type": "object",
            "properties": {
                "kind": {"type": "string", "description": "z. B. Handwerker, Zählerablesung, Übergabe"},
                "preferred_times": {"type": "string", "description": "Wunschzeiten des Mieters"},
                "location": {"type": "string"},
                "tenant_name": {"type": "string"},
                "contact": {"type": "string"},
                "notes": {"type": "string"},
            },
            "required": ["kind", "preferred_times", "location", "tenant_name", "contact"],
        },
    },
    {
        "name": "escalate_to_human",
        "description": (
            "Übergibt an einen Menschen der Hausverwaltung: bei Miete/Kündigung/Mietminderung/Kaution, "
            "Streit, Beschwerden über Nachbarn, rechtlichen Fragen, Unsicherheit oder auf Wunsch des Mieters."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "reason": {"type": "string"},
                "summary": {"type": "string", "description": "Kurze Zusammenfassung des Anliegens"},
                "tenant_name": {"type": "string"},
                "contact": {"type": "string"},
            },
            "required": ["reason", "summary", "contact"],
        },
    },
]


def _save(kind: str, payload: dict) -> str:
    ticket_id = f"{kind[:3].upper()}-{uuid.uuid4().hex[:6].upper()}"
    record = {"id": ticket_id, "type": kind, "created": datetime.now(timezone.utc).isoformat(), **payload}
    DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    with DATA_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record, ensure_ascii=False) + "\n")
    notify(record)
    return ticket_id


def notify(record: dict) -> None:
    """Platzhalter: hier E-Mail/Slack/WhatsApp an Verwaltung oder Hausmeister anbinden."""
    print(f"[NEUES TICKET] {record['id']} ({record['type']})", flush=True)


def run_tool(name: str, args: dict) -> tuple[str, bool]:
    """Gibt (Ergebnistext, ist_Fehler) zurück."""
    try:
        if name == "report_damage":
            if args.get("category") not in CATEGORIES or args.get("urgency") not in URGENCIES:
                return "Ungültige Kategorie oder Dringlichkeit.", True
            tid = _save("schaden", args)
            return f"Schadensmeldung gespeichert, Ticketnummer {tid}.", False
        if name == "request_appointment":
            tid = _save("termin", args)
            return f"Terminwunsch gespeichert, Referenz {tid}. Bestätigung folgt durch die Verwaltung.", False
        if name == "escalate_to_human":
            tid = _save("uebergabe", args)
            return f"Übergabe an die Verwaltung erfolgt, Referenz {tid}.", False
    except KeyError as e:
        return f"Pflichtangabe fehlt: {e}", True
    return f"Unbekanntes Tool: {name}", True
