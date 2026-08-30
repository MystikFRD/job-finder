#!/usr/bin/env python3
"""Write get_workflow_details payload JSON to a file (stdin)."""
import json
import pathlib
import sys

payload = json.load(sys.stdin)
out = pathlib.Path(sys.argv[1])
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(payload, indent=2))
print(f"wrote {out} ({out.stat().st_size} bytes)")
