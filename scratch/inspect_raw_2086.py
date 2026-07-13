import json
import sys

sys.stdout.reconfigure(encoding="utf-8")

log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_idx = data.get("step_index")
            if step_idx is not None and str(step_idx).startswith("2086"):
                print(json.dumps(data, indent=2, ensure_ascii=False))
                break
        except Exception as e:
            print("ERROR:", e)
