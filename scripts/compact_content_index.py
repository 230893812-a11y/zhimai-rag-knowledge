from __future__ import annotations

import argparse
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("path", type=Path)
    parser.add_argument("--chars", type=int, default=600)
    args = parser.parse_args()
    data = json.loads(args.path.read_text(encoding="utf-8"))
    if isinstance(data, dict):
        for item in data.values():
            if isinstance(item, dict) and isinstance(item.get("content"), str):
                item["content"] = item["content"][: args.chars]
    args.path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"compacted {args.path} to {args.path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
