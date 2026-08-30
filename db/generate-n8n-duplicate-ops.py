#!/usr/bin/env python3
"""Generate n8n update_workflow operation batches to duplicate a workflow JSON export."""
import json
import pathlib
import sys

SKIP_NODES = {"When clicking 'Execute workflow'", "manual_job_url_Input", "Edit Fields"}


def load(path):
    return json.loads(pathlib.Path(path).read_text())


def node_to_add(n, rename_suffix=""):
    name = n["name"] + rename_suffix
    item = {
        "type": "addNode",
        "node": {
            "name": name,
            "type": n["type"],
            "typeVersion": n["typeVersion"],
            "parameters": n.get("parameters", {}),
            "position": n.get("position", [0, 0]),
        },
    }
    if n.get("credentials"):
        item["node"]["credentials"] = n["credentials"]
    if n.get("onError"):
        item["node"]["parameters"] = item["node"]["parameters"]  # keep
    return item


def connections_to_add(conns, name_map):
    ops = []
    for source, outputs in conns.items():
        src = name_map.get(source, source)
        for output_idx, branches in enumerate(outputs.get("main", [])):
            for branch in branches:
                tgt = name_map.get(branch["node"], branch["node"])
                ops.append(
                    {
                        "type": "addConnection",
                        "source": src,
                        "target": tgt,
                        "sourceIndex": branch.get("index", 0),
                        "targetIndex": output_idx if False else branch.get("index", 0),
                    }
                )
    return ops


def main():
    src_path, out_dir = sys.argv[1], pathlib.Path(sys.argv[2])
    data = load(src_path)
    wf = data["workflow"]
    name_map = {n["name"]: n["name"] for n in wf["nodes"]}

    ops = [
        {
            "type": "setWorkflowMetadata",
            "name": wf["name"] + " (Web Config)",
            "description": "Duplicate — search/match params from jobs.mubu.dev/settings",
        }
    ]

    for n in wf["nodes"]:
        if n["name"] in SKIP_NODES:
            continue
        ops.append(node_to_add(n))

    # Custom overrides applied after duplicate base nodes
    overrides = {
        "Build Search Queries": pathlib.Path(__file__).parent / "n8n-code/build-search-queries-web.js",
        "location_filter": pathlib.Path(__file__).parent / "n8n-code/location-filter-web.js",
        "match_score": pathlib.Path(__file__).parent / "n8n-code/match-score-web.js",
    }

    out_dir.mkdir(parents=True, exist_ok=True)
    for i in range(0, len(ops), 80):
        batch = ops[i : i + 80]
        (out_dir / f"batch-{i//80}.json").write_text(json.dumps(batch, indent=2))
    print(f"wrote {len(ops)} ops in {(len(ops)+79)//80} batches to {out_dir}")


if __name__ == "__main__":
    main()
