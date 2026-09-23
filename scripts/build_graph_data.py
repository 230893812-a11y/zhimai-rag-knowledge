import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content" / "imported" / "langjian-knowledge-2026-v4"
OUTPUT = ROOT / "static" / "graph-app" / "graph-data.json"
FRONTMATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)
TITLE = re.compile(r"(?m)^title:\s*[\"]?(.+?)[\"]?\s*$")
TAGS = re.compile(r"(?ms)^tags:\s*\n((?:[ \t]+-.*\n?)*)")
TAG = re.compile(r"(?m)^\s+-\s+(.+?)\s*$")
WIKI = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]")


def slug_for(path: Path) -> str:
    return path.relative_to(SOURCE).with_suffix("").as_posix()


def clean_yaml_scalar(value: str) -> str:
    value = value.strip()
    if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
        return value[1:-1]
    return value


files = sorted(SOURCE.rglob("*.md"))
records = {}
for path in files:
    text = path.read_text(encoding="utf-8-sig")
    match = FRONTMATTER.match(text)
    front = match.group(1) if match else ""
    title_match = TITLE.search(front)
    title = clean_yaml_scalar(title_match.group(1)) if title_match else path.stem
    tags_match = TAGS.search(front)
    tags = [clean_yaml_scalar(m.group(1)) for m in TAG.finditer(tags_match.group(1))] if tags_match else []
    body = text[match.end():] if match else text
    records[slug_for(path)] = {"title": title, "tags": tags, "body": body}

nodes = []
edges = []
children_by_dir = {}
for slug, rec in records.items():
    parts = slug.split("/")
    parent = "root"
    for depth in range(1, len(parts)):
        dir_slug = "/".join(parts[:depth])
        directory_id = "dir:" + dir_slug
        children_by_dir.setdefault(dir_slug, set()).add(slug)
        parent = directory_id
    article_id = "page:" + slug
    nodes.append({"id": article_id, "label": rec["title"], "kind": "article", "slug": slug, "url": "../../" + slug + ".html", "parent": parent, "tags": rec["tags"]})

for dir_slug in sorted(children_by_dir):
    directory_id = "dir:" + dir_slug
    parent_slug = "/".join(dir_slug.split("/")[:-1])
    parent_id = "dir:" + parent_slug if parent_slug else "root"
    nodes.append({"id": directory_id, "label": dir_slug.split("/")[-1], "kind": "directory", "slug": dir_slug, "parent": parent_id})
    edges.append({"source": parent_id, "target": directory_id, "kind": "contains"})

by_slug = {slug: "page:" + slug for slug in records}
by_title = {}
for slug, rec in records.items():
    by_title.setdefault(rec["title"].casefold(), []).append(slug)

tags = sorted({tag for rec in records.values() for tag in rec["tags"] if tag})
for tag in tags:
    tag_id = "tag:" + tag
    nodes.append({"id": tag_id, "label": tag, "kind": "tag"})
for slug, rec in records.items():
    page_id = by_slug[slug]
    for tag in rec["tags"]:
        if tag:
            edges.append({"source": page_id, "target": "tag:" + tag, "kind": "tagged"})
    for target, _label in WIKI.findall(rec["body"]):
        normalized = target.strip().replace("\\", "/")
        candidate = normalized.lstrip("/")
        if candidate.startswith("."):
            resolved = (Path(slug).parent / candidate).as_posix()
            normalized_parts = []
            for part in resolved.split("/"):
                if part == "..":
                    if normalized_parts:
                        normalized_parts.pop()
                elif part != ".":
                    normalized_parts.append(part)
            candidate = "/".join(normalized_parts)
        candidate = re.sub(r"\.md$", "", candidate, flags=re.I)
        target_slug = candidate if candidate in records else None
        if target_slug is None:
            matches = by_title.get(Path(candidate).name.casefold(), []) or by_title.get(candidate.casefold(), [])
            if len(matches) == 1:
                target_slug = matches[0]
        if target_slug and target_slug != slug:
            edges.append({"source": page_id, "target": by_slug[target_slug], "kind": "link"})

nodes.append({"id": "root", "label": "小鼎的知识库", "kind": "root"})
node_ids = {node["id"] for node in nodes}
unique_edges = {}
for edge in edges:
    if edge["source"] in node_ids and edge["target"] in node_ids:
        unique_edges[(edge["source"], edge["target"], edge["kind"])] = edge

payload = {
    "nodes": nodes,
    "edges": list(unique_edges.values()),
    "stats": {"articles": len(records), "directories": len(children_by_dir), "tags": len(tags), "nodes": len(nodes), "edges": len(unique_edges)},
}
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
OUTPUT.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps(payload["stats"], ensure_ascii=False))
