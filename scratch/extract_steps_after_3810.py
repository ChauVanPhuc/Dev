import json
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript.jsonl"
output_path = r"C:\SmartFlow_v2_Test\scratch\steps_after_3810.txt"

with open(log_path, "r", encoding="utf-8") as f, open(output_path, "w", encoding="utf-8") as out:
    lines = f.readlines()
    for idx in range(3810, len(lines)):
        try:
            data = json.loads(lines[idx])
            step = data.get("step_index")
            source = data.get("source")
            type_ = data.get("type")
            content = data.get("content", "")
            summary = content[:300].replace("\n", " ")
            out.write(f"Step {step} | Source: {source} | Type: {type_} | Summary: {summary}\n")
            if "tool_calls" in data:
                for tc in data["tool_calls"]:
                    out.write(f"  Tool Call: {tc['name']} with args {tc.get('args')}\n")
        except Exception as e:
            out.write(f"Error parsing line {idx}: {e}\n")
print("Done writing to steps_after_3810.txt")
