"""Erzeugt mieter-chatbot.html (eine Datei) aus template.html + knowledge/hausverwaltung.md."""
import json
from pathlib import Path

root = Path(__file__).parent.parent
knowledge = (root / "knowledge" / "hausverwaltung.md").read_text(encoding="utf-8")
html = (Path(__file__).parent / "template.html").read_text(encoding="utf-8")
# "</" escapen, damit der Text das <script>-Tag nicht beenden kann
js = json.dumps(knowledge, ensure_ascii=False).replace("</", "<\\/")
(root / "mieter-chatbot.html").write_text(html.replace("__KNOWLEDGE__", js), encoding="utf-8")
print("mieter-chatbot.html erzeugt")
