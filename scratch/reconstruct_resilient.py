import json
import sys
import subprocess
import re

# 1. Get clean file from Git HEAD
clean_content = subprocess.check_output(
    ["git", "show", "1bb7f57096fc815730c86078a9d5e262ecd90ae1:FrontEnd/Web/modules/ISO/Views/ISOFormEditorView.jsx"],
    text=True,
    encoding="utf-8"
)

# 2. Parse transcript to collect all edits
log_path = r"C:\Users\Administrator\.gemini\antigravity-ide\brain\1019c409-628b-440d-af66-39c67e886ffd\.system_generated\logs\transcript_full.jsonl"

edits = []
with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            step_idx = data.get("step_index")
            # Only process edits from the previous session (step_index < 3600)
            if step_idx is not None and step_idx < 3600:
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
                                    "step": step_idx,
                                    "tool": tc.get("name"),
                                    "args": args
                                })
        except Exception as e:
            pass

print(f"Collected {len(edits)} edits from previous session to apply.")

def clean_line_super(line):
    line = "".join(line.split())
    line = line.replace('placeholder=""', '')
    line = line.replace("placeholder=''", '')
    line = line.replace("'", '"')
    return line

def find_and_replace_resilient(content, target, replacement, step):
    content_lf = content.replace("\r\n", "\n")
    target_lf = target.replace("\r\n", "\n")
    replacement_lf = replacement.replace("\r\n", "\n")
    
    c_lines = content_lf.split("\n")
    t_lines = target_lf.split("\n")
    
    t_cleaned = [clean_line_super(l) for l in t_lines if l.strip()]
    if not t_cleaned:
        return content_lf.replace(target_lf, replacement_lf)
        
    num_t = len(t_cleaned)
    matching_start = -1
    matching_end = -1
    
    for i in range(len(c_lines) - num_t + 1):
        sub_c_lines = []
        c_indices = []
        idx = i
        while len(sub_c_lines) < num_t and idx < len(c_lines):
            line = c_lines[idx]
            if line.strip():
                sub_c_lines.append(clean_line_super(line))
                c_indices.append(idx)
            idx += 1
            
        if len(sub_c_lines) == num_t and sub_c_lines == t_cleaned:
            matching_start = c_indices[0]
            matching_end = c_indices[-1]
            break
            
    if matching_start != -1:
        new_lines = c_lines[:matching_start] + [replacement_lf] + c_lines[matching_end + 1:]
        return "\n".join(new_lines)
    else:
        if target_lf in content_lf:
            return content_lf.replace(target_lf, replacement_lf)
        print(f"WARNING: Match not found at Step {step}. Skipping.")
        return content_lf

current_content = clean_content

for idx, edit in enumerate(edits):
    step = edit["step"]
    tool = edit["tool"]
    args = edit["args"]
    print(f"Applying edit {idx+1}/{len(edits)} from Step {step} ({tool})...")
    
    try:
        if tool == "write_to_file":
            current_content = args["CodeContent"]
        elif tool == "replace_file_content":
            target = args["TargetContent"]
            replacement = args["ReplacementContent"]
            current_content = find_and_replace_resilient(current_content, target, replacement, step)
        elif tool == "multi_replace_file_content":
            chunks = args.get("ReplacementChunks", [])
            for chunk in chunks:
                target = chunk["TargetContent"]
                replacement = chunk["ReplacementContent"]
                current_content = find_and_replace_resilient(current_content, target, replacement, step)
    except Exception as e:
        print(f"ERROR: Failed to apply edit at Step {step} ({tool}): {e}")
        sys.exit(1)

# Write the final reconstructed file
with open("scratch/reconstructed_ISOFormEditorView.jsx", "w", encoding="utf-8") as out:
    out.write(current_content)

print("SUCCESS: File reconstructed resiliently at scratch/reconstructed_ISOFormEditorView.jsx")
