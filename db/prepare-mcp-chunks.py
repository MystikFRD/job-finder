#!/usr/bin/env python3
"""Apply n8n update_workflow batch JSON files to a workflow via MCP-style local prep."""
import json
import pathlib
import sys

def load_batches(dir_path: pathlib.Path):
    ops = []
    for batch in sorted(dir_path.glob('batch-*.json')):
        ops.extend(json.loads(batch.read_text()))
    return ops

def chunk_ops(ops, size=90):
    for i in range(0, len(ops), size):
        yield ops[i:i+size]

def main():
    batch_dir = pathlib.Path(sys.argv[1])
    ops = load_batches(batch_dir)
    print(f"loaded {len(ops)} ops from {batch_dir}")
    for i, chunk in enumerate(chunk_ops(ops)):
        out = batch_dir / f'_mcp-chunk-{i:02d}.json'
        out.write_text(json.dumps({
            'workflowId': 'ROTREzXrgqrC8ffZ',
            'versionName': f'Duplicate finder chunk {i}',
            'operations': chunk
        }, indent=2))
        print(f'chunk {i}: {len(chunk)} ops -> {out}')

if __name__ == '__main__':
    main()
