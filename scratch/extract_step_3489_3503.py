import json
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

for step in [3489, 3503]:
    with open(log_path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                data = json.loads(line)
                if data.get("step_index") == step:
                    with open(f"scratch/step_{step}.json", "w", encoding="utf-8") as out:
                        json.dump(data, out, indent=2, ensure_ascii=False)
                    print(f"Saved step {step}")
                    break
            except Exception as e:
                pass
