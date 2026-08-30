#!/usr/bin/env python3
"""Apply pre-generated update_workflow batch files to an n8n workflow via Cursor MCP.

Usage (from project root, with batches in db/n8n-ops/finder/):
  python3 db/apply-n8n-batches.py ROTREzXrgqrC8ffZ db/n8n-ops/finder

Prints JSON payloads for manual MCP update_workflow calls when run outside Cursor.
"""
from __future__ import annotations

import json
import pathlib
import sys


def main() -> None:
    if len(sys.argv) < 3:
        print(__doc__, file=sys.stderr)
        sys.exit(1)
    workflow_id = sys.argv[1]
    batch_dir = pathlib.Path(sys.argv[2])
    batches = sorted(batch_dir.glob("batch-*.json"))
    if not batches:
        print(f"No batch-*.json in {batch_dir}", file=sys.stderr)
        sys.exit(1)
    for batch in batches:
        ops = json.loads(batch.read_text())
        payload = {
            "workflowId": workflow_id,
            "versionName": f"Apply {batch.name}",
            "operations": ops,
        }
        print(json.dumps({"batch": batch.name, "ops": len(ops), "payload": payload})[:200] + "...")
    print(f"{len(batches)} batches ready for workflow {workflow_id}")


if __name__ == "__main__":
    main()
