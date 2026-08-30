#!/usr/bin/env python3
"""Write n8n workflow export JSON from stdin (full get_workflow_details payload)."""
import json
import pathlib
import sys

payload = json.load(sys.stdin)
out = pathlib.Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps({"workflow": payload["workflow"]}, indent=2))
print(f"wrote {out} ({out.stat().st_size} bytes)")
