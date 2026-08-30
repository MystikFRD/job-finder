#!/usr/bin/env python3
"""Read get_workflow_version JSON from stdin and write export + duplicate batches."""
import json
import pathlib
import sys

DEFAULT_SKIP = {
    "When clicking 'Execute workflow'",
    "When clicking ‘Execute workflow’",
}


def build_ops(wf, extra_skip):
    skip = DEFAULT_SKIP | extra_skip
    nodes = [n for n in wf["nodes"] if n["name"] not in skip]
    names = {n["name"] for n in nodes}
    ops = []
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
        if n.get("onError"):
            op["node"]["onError"] = n["onError"]
        if n.get("retryOnFail"):
            op["node"]["retryOnFail"] = n["retryOnFail"]
        if n.get("maxTries"):
            op["node"]["maxTries"] = n["maxTries"]
        if n.get("waitBetweenTries"):
            op["node"]["waitBetweenTries"] = n["waitBetweenTries"]
        if n.get("alwaysOutputData"):
            op["node"]["alwaysOutputData"] = n["alwaysOutputData"]
        ops.append(op)

    for source, outputs in wf.get("connections", {}).items():
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
    return nodes, ops


def main():
    root = pathlib.Path(__file__).resolve().parent
    version = json.load(sys.stdin)
    wf = {
        "id": "uLK7o4ilL7JGl7Pr",
        "name": "Automatic Job Finder",
        "nodes": version["nodes"],
        "connections": version["connections"],
    }
    export_path = root / "n8n-exports" / "finder.json"
    out_dir = root / "n8n-ops" / "finder"
    extra_skip = set(sys.argv[1].split(",")) if len(sys.argv) > 1 and sys.argv[1] else set()

    export_path.parent.mkdir(parents=True, exist_ok=True)
    export_path.write_text(json.dumps({"workflow": wf}, indent=2))

    nodes, ops = build_ops(wf, extra_skip | {"Schedule Trigger"})
    out_dir.mkdir(parents=True, exist_ok=True)
    chunk = 90
    for i in range(0, len(ops), chunk):
        (out_dir / f"batch-{i // chunk:02d}.json").write_text(json.dumps(ops[i : i + chunk], indent=2))

    print(f"export {export_path} ({len(wf['nodes'])} nodes, {export_path.stat().st_size} bytes)")
    print(f"{len(nodes)} dup nodes, {len(ops)} ops -> {out_dir}")


if __name__ == "__main__":
    main()
