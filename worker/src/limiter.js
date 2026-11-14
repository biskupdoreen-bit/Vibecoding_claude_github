import { DurableObject } from "cloudflare:workers";

/**
 * Zählt Anfragen. Ein einziges Objekt hält alle Zähler des laufenden Tages;
 * beim Datumswechsel wird alles gelöscht.
 * POST { ip, perMinute, perIpDay, globalDay } -> { ok, reason? }
 */
export class Limiter extends DurableObject {
  async fetch(request) {
    const { ip, perMinute, perIpDay, globalDay } = await request.json();
    const storage = this.ctx.storage;
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    const minute = Math.floor(now.getTime() / 60000);

    if ((await storage.get("day")) !== day) {
      await storage.deleteAll();
      await storage.put("day", day);
    }

    const [g, d, m] = await Promise.all([
      storage.get("global"),
      storage.get(`ip:${ip}`),
      storage.get(`min:${ip}:${minute}`),
    ]);
    if ((g ?? 0) >= globalDay) return Response.json({ ok: false, reason: "global" });
    if ((d ?? 0) >= perIpDay) return Response.json({ ok: false, reason: "day" });
    if ((m ?? 0) >= perMinute) return Response.json({ ok: false, reason: "minute" });

    await storage.put({ global: (g ?? 0) + 1, [`ip:${ip}`]: (d ?? 0) + 1, [`min:${ip}:${minute}`]: (m ?? 0) + 1 });
    return Response.json({ ok: true });
  }
}
