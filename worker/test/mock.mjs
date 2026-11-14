// Minimaler Test-Server: täuscht Anthropic- und Resend-API vor und merkt sich die E-Mails.
import http from "node:http";
const emails = [];
http.createServer((req, res) => {
  let b = ""; req.on("data", (c) => (b += c)); req.on("end", () => {
    res.setHeader("content-type", "application/json");
    if (req.url === "/emails") { emails.push(JSON.parse(b)); return res.end('{"id":"x"}'); }
    if (req.url === "/seen") return res.end(JSON.stringify(emails));
    const msgs = JSON.parse(b).messages;
    const last = msgs.at(-1);
    if (Array.isArray(last.content) && last.content[0]?.type === "tool_result")
      return res.end(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Gespeichert: " + last.content[0].content }] }));
    if (String(last.content).includes("Heizung"))
      return res.end(JSON.stringify({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "t1", name: "report_damage", input: { category: "heizung", urgency: "hoch", location: "Whg 3", description: "kalt", tenant_name: "Test", contact: "t@example.de" } }] }));
    res.end(JSON.stringify({ stop_reason: "end_turn", content: [{ type: "text", text: "Hallo vom Mock" }] }));
  });
}).listen(8788, "127.0.0.1");
