import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "static" / "graph-app" / "graph-data.json"
PUBLIC = ROOT / "public"
SOURCE = ROOT / "content" / "imported" / "langjian-knowledge-2026-v4"

payload = json.loads(DATA.read_text(encoding="utf-8"))
nodes = payload["nodes"]
edges = payload["edges"]
ids = [node["id"] for node in nodes]
assert len(ids) == len(set(ids)), "duplicate node ids"

node_map = {node["id"]: node for node in nodes}
for node in nodes:
    if node["kind"] in {"article", "directory"}:
        parent = node.get("parent")
        assert parent in node_map or parent == "root", f"missing parent: {node['id']} -> {parent}"
for edge in edges:
    assert edge["source"] in node_map, f"missing edge source: {edge['source']}"
    assert edge["target"] in node_map, f"missing edge target: {edge['target']}"

missing_urls = []
for node in nodes:
    if node["kind"] != "article":
        continue
    target = SOURCE.joinpath(*node["slug"].split("/")).with_name(Path(node["slug"]).name + ".md").resolve()
    if not target.exists():
        missing_urls.append((node["slug"], str(target)))
assert not missing_urls, f"missing article files: {missing_urls[:5]}"

print(json.dumps({
    "nodes": len(nodes),
    "edges": len(edges),
    "articles": payload["stats"]["articles"],
    "directories": payload["stats"]["directories"],
    "tags": payload["stats"]["tags"],
    "missing_urls": 0,
}, ensure_ascii=False))
