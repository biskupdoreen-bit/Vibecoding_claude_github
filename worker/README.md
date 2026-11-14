# Chatbot-Proxy (Cloudflare Worker)

Hält Anthropic-Key, Systemprompt, Wissensbasis und Tools. Die Chat-Seite sendet nur Text an diesen Proxy.
Er prüft die Herkunft der Seite, begrenzt Anfragen (pro Minute, pro Besucher/Tag, insgesamt/Tag) und
schickt Tickets per E-Mail (Resend) an `NOTIFY_EMAIL`.

## Einrichten über GitHub (ohne Terminal)
1. **Cloudflare**: kostenloses Konto anlegen. Unter *My Profile → API Tokens → Create Token* die Vorlage
   „Edit Cloudflare Workers" nehmen. Token und die *Account ID* (Workers & Pages, rechte Seite) notieren.
2. **Resend** (resend.com): kostenloses Konto, unter *API Keys* einen Key erzeugen. Ohne eigene Domain
   sendet Resend nur an die E-Mail-Adresse des Resend-Kontos – diese als `NOTIFY_EMAIL` verwenden.
3. **GitHub**: Repo → *Settings → Secrets and variables → Actions → Secrets*:
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `NOTIFY_EMAIL`.
4. Actions → **Deploy Chatbot-Proxy** → *Run workflow*. Die Adresse (`https://mieter-chatbot-proxy.<konto>.workers.dev`)
   steht im Log bzw. im Cloudflare-Dashboard.
5. GitHub → *Variables* (neben Secrets): `PROXY_URL` = diese Adresse. Dann **Deploy Mieter-Chatbot** neu starten.
6. `ALLOWED_ORIGIN` in `wrangler.toml` muss zur Adresse der Chat-Seite passen (nur `https://<name>.github.io`, ohne Pfad).

## Einrichten mit Terminal (Alternative)
```bash
cd worker && npm install && npx wrangler login
npx wrangler secret put ANTHROPIC_API_KEY
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put NOTIFY_EMAIL
npx wrangler deploy
```

## Lokal testen
`worker/test/mock.mjs` täuscht Anthropic und Resend vor; `.dev.vars` enthält Testwerte (nicht einchecken).
`npx wrangler dev --var ALLOWED_ORIGIN:https://test.example` und mit `curl` gegen `http://127.0.0.1:8787` testen.

## Grenzen
- Limits schützen das Budget, ersetzen aber keinen Login. Zusätzlich in der Anthropic-Konsole ein Ausgabenlimit setzen.
- Wissen/Prompt ändern: `knowledge/hausverwaltung.md` bzw. `worker/src/prompt.js`, dann neu bereitstellen.
