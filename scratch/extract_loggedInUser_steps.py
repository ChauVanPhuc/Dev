import json
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

for target_step in [2086, 2174, 2181]:
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get("step_index") == target_step:
                    print(f"--- STEP {target_step} ---")
                    for tc in data["tool_calls"]:
                        args = tc.get("args", {})
                        if isinstance(args, str):
                            args = json.loads(args)
                        if isinstance(args, dict):
                            # Print single replace
                            if "ReplacementContent" in args:
                                print(f"Target:\n{args.get('TargetContent')}\nReplacement:\n{args.get('ReplacementContent')}")
                            # Print multi replace
                            if "ReplacementChunks" in args:
                                for chunk in args["ReplacementChunks"]:
                                    print(f"Chunk Target:\n{chunk.get('TargetContent')}\nChunk Replacement:\n{chunk.get('ReplacementContent')}")
                    break
            except Exception as e:
                pass
