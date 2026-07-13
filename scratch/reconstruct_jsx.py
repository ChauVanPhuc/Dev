import json
import sys
import subprocess

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

current_content = clean_content

def apply_edit(content, target, replacement):
    # Normalize line endings to LF for consistent matching
    c_lf = content.replace("\r\n", "\n")
    t_lf = target.replace("\r\n", "\n")
    r_lf = replacement.replace("\r\n", "\n")
    
    if t_lf not in c_lf:
        # Let's try stripping whitespaces at the end of lines in target and content to be more resilient
        c_lines = [line.rstrip() for line in c_lf.split("\n")]
        t_lines = [line.rstrip() for line in t_lf.split("\n")]
        
        c_str = "\n".join(c_lines)
        t_str = "\n".join(t_lines)
        r_str = "\n".join([line.rstrip() for line in r_lf.split("\n")])
        
        if t_str in c_str:
            c_str = c_str.replace(t_str, r_str)
            # Reconstruct with LF
            return c_str
        
        # If it still fails, print a snippet of target and raise error
        print(f"Target not found. Target start: {repr(t_lf[:100])}")
        raise ValueError("Target not found")
        
    c_lf = c_lf.replace(t_lf, r_lf)
    return c_lf

for idx, edit in enumerate(edits):
    step = edit["step"]
    tool = edit["tool"]
    args = edit["args"]
    print(f"Applying edit {idx+1}/{len(edits)} from Step {step} ({tool})...")
    
    try:
        if tool == "write_to_file":
            # Direct overwrite
            current_content = args["CodeContent"]
        elif tool == "replace_file_content":
            target = args["TargetContent"]
            replacement = args["ReplacementContent"]
            current_content = apply_edit(current_content, target, replacement)
        elif tool == "multi_replace_file_content":
            chunks = args.get("ReplacementChunks", [])
            for chunk in chunks:
                target = chunk["TargetContent"]
                replacement = chunk["ReplacementContent"]
                current_content = apply_edit(current_content, target, replacement)
    except Exception as e:
        print(f"ERROR: Failed to apply edit at Step {step} ({tool}): {e}")
        # Write intermediate content to debug
        with open("scratch/reconstruction_failed_step.txt", "w", encoding="utf-8") as out:
            out.write(current_content)
        sys.exit(1)

# Write the final reconstructed file
with open("scratch/reconstructed_ISOFormEditorView.jsx", "w", encoding="utf-8") as out:
    out.write(current_content)

print("SUCCESS: File reconstructed successfully at scratch/reconstructed_ISOFormEditorView.jsx")
