import json
import sys

log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

print(f"Total steps: {len(lines)}")

# We want to search from the end backwards to find the last time ISOFormEditorView.jsx was edited.
for idx in range(len(lines) - 1, -1, -1):
    try:
        data = json.loads(lines[idx])
        if "tool_calls" in data:
            for tc in data["tool_calls"]:
                args = tc.get("args", {})
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except:
                        pass
                if isinstance(args, dict):
                    target_file = args.get("TargetFile", "")
                    if "ISOFormEditorView.jsx" in target_file:
                        print(f"Last edit found at step index {data.get('step_index')}, step line {idx}")
                        print(f"Tool name: {tc.get('name')}")
                        print(f"Arguments: {list(args.keys())}")
                        # If there is ReplacementContent or CodeContent, let's write it to a debug file
                        content = args.get("ReplacementContent", "") or args.get("CodeContent", "")
                        if content:
                            print(f"Found content of length {len(content)}")
                            with open("scratch/extracted_content.txt", "w", encoding="utf-8") as out:
                                out.write(content)
                        else:
                            chunks = args.get("ReplacementChunks", [])
                            print(f"Found chunks: {len(chunks)}")
                            with open("scratch/extracted_chunks.json", "w", encoding="utf-8") as out:
                                json.dump(chunks, out, indent=2, ensure_ascii=False)
                        sys.exit(0)
    except SystemExit:
        sys.exit(0)
    except Exception as e:
        pass
print("No edits found.")
