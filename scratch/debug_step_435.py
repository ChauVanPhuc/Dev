import json
import re

with open("scratch/reconstruction_failed_step.txt", "r", encoding="utf-8") as f:
    content = f.read()

with open("scratch/step_435.json", "r", encoding="utf-8") as f:
    step_data = json.load(f)
    target = step_data["tool_calls"][0]["args"]["TargetContent"]

def clean_line(line):
    return "".join(line.split())

c_lines = content.split("\n")
t_lines = target.split("\n")

with open("scratch/debug_step_435_output.txt", "w", encoding="utf-8") as out:
    out.write(f"Target lines count: {len(t_lines)}\n")
    out.write("First few target lines (cleaned):\n")
    for i, l in enumerate(t_lines[:5]):
        out.write(f"T{i}: {repr(clean_line(l))}\n")

    out.write("\nSearching in content for lines starting with gridTemplateColumns...\n")
    for idx, line in enumerate(c_lines):
        if "gridTemplateColumns" in line:
            out.write(f"Line {idx}: {repr(line)}\n")
            out.write("Subsequent 5 lines:\n")
            for offset in range(1, 10):
                if idx + offset < len(c_lines):
                    out.write(f"  +{offset}: {repr(c_lines[idx+offset])}\n")
print("Done")
