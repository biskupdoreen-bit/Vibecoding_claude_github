import json

from app import tools


def test_report_damage_saves_ticket(tmp_path, monkeypatch):
    monkeypatch.setattr(tools, "DATA_FILE", tmp_path / "t.jsonl")
    out, err = tools.run_tool("report_damage", {
        "category": "heizung", "urgency": "hoch", "location": "Whg 3",
        "description": "kalt", "tenant_name": "A", "contact": "a@b.de"})
    assert not err and "Ticketnummer" in out
    assert json.loads((tmp_path / "t.jsonl").read_text())["category"] == "heizung"


def test_invalid_category_rejected(tmp_path, monkeypatch):
    monkeypatch.setattr(tools, "DATA_FILE", tmp_path / "t.jsonl")
    _, err = tools.run_tool("report_damage", {"category": "x", "urgency": "hoch"})
    assert err


def test_unknown_tool():
    assert tools.run_tool("rm_rf", {})[1]
