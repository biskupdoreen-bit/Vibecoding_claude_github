# Mieter-Chatbot (Prototyp)

Web-Chat für die Mieterkommunikation: beantwortet FAQ, nimmt Schadensmeldungen und Terminwünsche auf und übergibt komplexe Fälle an einen Menschen. Basis: Claude API (Python, FastAPI).

## Start
```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
export ANTHROPIC_API_KEY=sk-ant-...
uvicorn app.main:app --reload
```
Dann http://localhost:8000 öffnen. Tests: `pytest`.

## Anpassen
- `knowledge/hausverwaltung.md`: Wissensbasis (aktuell Beispieldaten!) durch echte Angaben ersetzen.
- `app/bot.py`: Systemprompt/Regeln; Modell per `CHATBOT_MODEL` (Standard `claude-opus-5-5`).
- `app/tools.py`: Tickets landen in `data/tickets.jsonl`; `notify()` an E-Mail/Slack/WhatsApp anbinden.

## Vor dem Produktivbetrieb (DSGVO u. a.)
- Hinweis im Chat, dass es ein KI-Assistent ist und Daten verarbeitet werden; Datenschutzerklärung ergänzen.
- Auftragsverarbeitungsvertrag mit Anthropic abschließen, Datenminimierung und Löschfristen festlegen.
- Gespräche/Tickets in einer Datenbank mit Löschkonzept speichern (aktuell nur im Speicher bzw. Datei).
- Mieter-Authentifizierung (Login/Magic-Link), damit Auskünfte zu Verträgen nur an Berechtigte gehen.
- Notfallnummer prominent einblenden; Bot gibt keine Rechtsauskunft.

## Variante ohne Server: eine einzelne HTML-Datei
`mieter-chatbot.html` läuft ohne Backend direkt im Browser (Datei öffnen oder irgendwo hochladen).
Neu erzeugen nach Änderungen an `knowledge/hausverwaltung.md`: `python3 standalone/build.py`.

**Wichtig:** Der API-Key wird beim ersten Senden abgefragt und liegt dann im Browser. Diese Variante ist nur für
eigene Tests gedacht – nicht für Mieter veröffentlichen, sonst kann jeder den Key missbrauchen. Tickets bleiben im
Browser (localStorage); der Button „Tickets exportieren“ lädt sie als `tickets.json` herunter.
