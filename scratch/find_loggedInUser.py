import json
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    args = tc.get("args", {})
                    if isinstance(args, str):
                        try:
                            args = json.loads(args)
                        except:
                            pass
                    if isinstance(args, dict):
                        repl = args.get("ReplacementContent", "") or args.get("CodeContent", "")
                        if "loggedInUser" in repl:
                            print(f"Step {data.get('step_index')}: {tc.get('name')}")
                            print(repl[:200].replace('\n', ' '))
                            print("-" * 50)
        except Exception as e:
            pass
