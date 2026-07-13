import json
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"
output_path = r"C:\SmartFlow_v2_Test\scratch\step_2200_details.txt"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("step_index") == 2200:
                with open(output_path, "w", encoding="utf-8") as out:
                    json.dump(data, out, indent=2, ensure_ascii=False)
                print("Found step 2200 and saved details.")
                break
        except Exception as e:
            pass
