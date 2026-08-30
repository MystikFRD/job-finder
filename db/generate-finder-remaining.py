#!/usr/bin/env python3
"""Generate update_workflow ops for finder Web Config, skipping nodes already on target."""
import json
import pathlib
import sys

DEFAULT_SKIP = {
    "When clicking 'Execute workflow'",
    "When clicking ‘Execute workflow’",
    "Schedule Trigger",
}


def node_to_add(n):
    op = {
        "type": "addNode",
        "node": {
            "name": n["name"],
            "type": n["type"],
            "typeVersion": n["typeVersion"],
            "parameters": n.get("parameters", {}),
            "position": n.get("position", [0, 0]),
        },
    }
    for key in ("credentials", "onError", "retryOnFail", "maxTries", "waitBetweenTries", "alwaysOutputData", "disabled"):
        if n.get(key) is not None:
            op["node"][key] = n[key]
    return op


def main():
    src_path = pathlib.Path(sys.argv[1])
    out_dir = pathlib.Path(sys.argv[2])
    extra_skip = set(sys.argv[3].split(",")) if len(sys.argv) > 3 and sys.argv[3] else set()

    raw = json.loads(src_path.read_text())
    if "workflow" in raw:
        wf = raw["workflow"]
    elif "nodes" in raw:
        wf = raw
    else:
        raise SystemExit("unknown payload shape")

    skip = DEFAULT_SKIP | extra_skip
    nodes = [n for n in wf["nodes"] if n["name"] not in skip]
    names = {n["name"] for n in nodes}

    ops = [node_to_add(n) for n in nodes]

    for source, outputs in wf.get("connections", {}).items():
        if source not in names and source not in skip:
            # connection from trigger nodes already wired on target
            if source in DEFAULT_SKIP:
                continue
        if source not in names:
            continue
        for conn_type, branches in outputs.items():
            for output_idx, targets in enumerate(branches):
                for t in targets:
                    if t["node"] not in names:
                        continue
                    ops.append(
                        {
                            "type": "addConnection",
                            "source": source,
                            "target": t["node"],
                            "sourceIndex": output_idx,
                            "targetIndex": t.get("index", 0),
                            "connectionType": conn_type,
                        }
                    )

    out_dir.mkdir(parents=True, exist_ok=True)
    chunk = 8  # keep MCP payloads small
    for i in range(0, len(ops), chunk):
        (out_dir / f"batch-{i // chunk:02d}.json").write_text(json.dumps(ops[i : i + chunk], indent=2))
    print(f"{len(nodes)} nodes to add, {len(ops)} ops in {(len(ops) + chunk - 1) // chunk} batches -> {out_dir}")
