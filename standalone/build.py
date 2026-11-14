"""Erzeugt mieter-chatbot.html (eine Datei) aus template.html.
Die Adresse des Proxys kommt aus der Umgebungsvariable PROXY_URL, z. B.
  PROXY_URL=https://mieter-chatbot-proxy.DEIN-NAME.workers.dev python3 standalone/build.py
Wissen und Systemprompt liegen im Worker (worker/), nicht mehr in der HTML-Datei."""
import json
import os
from pathlib import Path

root = Path(__file__).parent.parent
url = os.environ.get("PROXY_URL") or "https://BITTE-PROXY-URL-EINTRAGEN.workers.dev"
html = (Path(__file__).parent / "template.html").read_text(encoding="utf-8")
(root / "mieter-chatbot.html").write_text(html.replace("__PROXY_URL__", json.dumps(url)), encoding="utf-8")
print("mieter-chatbot.html erzeugt, Proxy:", url)
