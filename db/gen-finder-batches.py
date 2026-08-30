#!/usr/bin/env python3
"""Generate small update_workflow batches from get_workflow_version JSON (stdin)."""
import json
import pathlib
import sys

SKIP = {"Schedule Trigger"}
NODE_CHUNK = 8
CONN_CHUNK = 40


def build_ops(wf):
    nodes = [n for n in wf["nodes"] if n["name"] not in SKIP]
    names = {n["name"] for n in nodes}
    node_ops = []
    conn_ops = []
    for n in nodes:
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
        if n.get("credentials"):
            op["node"]["credentials"] = n["credentials"]
        for key in ("onError", "retryOnFail", "maxTries", "waitBetweenTries", "alwaysOutputData", "disabled"):
            if n.get(key) is not None:
                op["node"][key] = n[key]
        node_ops.append(op)

    for source, outputs in wf.get("connections", {}).items():
        if source not in names:
            continue
        for conn_type, branches in outputs.items():
            for output_idx, targets in enumerate(branches):
                for t in targets:
                    if t["node"] not in names:
                        continue
                    conn_ops.append(
                        {
                            "type": "addConnection",
                            "source": source,
                            "target": t["node"],
                            "sourceIndex": output_idx,
                            "targetIndex": t.get("index", 0),
                            "connectionType": conn_type,
                        }
                    )
    return node_ops, conn_ops


def write_batches(out_dir, ops, prefix, chunk):
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i in range(0, len(ops), chunk):
        path = out_dir / f"{prefix}-{i // chunk:02d}.json"
        path.write_text(json.dumps(ops[i : i + chunk], indent=2))
        paths.append(path)
    return paths


def main():
    root = pathlib.Path(__file__).resolve().parent
    version = json.load(sys.stdin)
    wf = {"nodes": version["nodes"], "connections": version["connections"]}
    node_ops, conn_ops = build_ops(wf)
    out_dir = root / "n8n-ops" / "finder"
    node_paths = write_batches(out_dir, node_ops, "nodes", NODE_CHUNK)
    conn_paths = write_batches(out_dir, conn_ops, "conn", CONN_CHUNK)
    manual = [
        {"type": "addConnection", "source": "Schedule Trigger", "target": "Create Search Run"},
        {
            "type": "addConnection",
            "source": "When clicking ‘Execute workflow’",
            "target": "Create Search Run",
        },
    ]
    (out_dir / "manual-conn.json").write_text(json.dumps(manual, indent=2))
    print(json.dumps({"nodes": len(node_ops), "connections": len(conn_ops), "node_batches": len(node_paths), "conn_batches": len(conn_paths)}))


if __name__ == "__main__":
    main()
