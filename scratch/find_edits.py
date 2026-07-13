import json

log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

edits = []
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
                        target_file = args.get("TargetFile", "")
                        if "ISOFormEditorView.jsx" in target_file:
                            edits.append({
                                "step": data.get("step_index"),
                                "tool": tc.get("name"),
                                "args": args
                            })
        except Exception as e:
            pass

with open("scratch/edits_log.txt", "w", encoding="utf-8") as out:
    out.write(f"Found {len(edits)} edits to ISOFormEditorView.jsx:\n")
    for edit in edits:
        out.write(f"Step {edit['step']}: Tool {edit['tool']}\n")
        instr = edit['args'].get('Instruction', '')
        desc = edit['args'].get('Description', '')
        if instr:
            out.write(f"  Instruction: {instr}\n")
        if desc:
            out.write(f"  Description: {desc}\n")
        # Let's write target content / replacement content length
        target_len = len(edit['args'].get('TargetContent', ''))
        repl_len = len(edit['args'].get('ReplacementContent', ''))
        out.write(f"  Target len: {target_len}, Replacement len: {repl_len}\n")
