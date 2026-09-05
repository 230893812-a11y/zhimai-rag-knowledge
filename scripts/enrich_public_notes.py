from pathlib import Path
from datetime import date
import re

ROOT = Path(__file__).resolve().parents[1] / "quartz-knowledge-site" / "content" / "图谱条目"
TODAY = date.today().isoformat()

for path in ROOT.rglob("*.md"):
    if path.name == "index.md":
        continue
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        continue
    parts = text.split("---", 2)
    front, body = parts[1], parts[2]
    category = path.parent.name
    tag = {"AI工具实操教程": "AI工具", "大学规划与职业发展": "大学发展", "课程体系与核心课件": "AI课程"}.get(category, "知识资料")
    additions = []
    if not re.search(r"^category\s*:", front, re.M): additions.append(f"category: {category}")
    if not re.search(r"^tags\s*:", front, re.M): additions += ["tags:", f"  - {tag}"]
    if not re.search(r"^source\s*:", front, re.M): additions.append("source: 未标注")
    if not re.search(r"^updated\s*:", front, re.M): additions.append(f"updated: {TODAY}")
    if not re.search(r"^status\s*:", front, re.M): additions.append("status: active")
    if not re.search(r"^visibility\s*:", front, re.M): additions.append("visibility: public")
    if additions:
        path.write_text("---\n" + front.strip() + "\n" + "\n".join(additions) + "\n---" + body, encoding="utf-8")
        print(f"updated: {path}")
