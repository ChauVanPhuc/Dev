import os
import re

def analyze_conflicts(directory):
    # get conflicted files
    conflicted = os.popen('git diff --name-only --diff-filter=U').read().splitlines()
    with open('conflicts_report.txt', 'w', encoding='utf-8') as out:
        for file in conflicted:
            path = os.path.join(directory, file)
            if not os.path.exists(path):
                continue
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                
            conflicts = re.findall(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> [^\n]+', content, re.DOTALL)
            if conflicts:
                out.write(f"\n=================================\n")
                out.write(f"File: {file} - {len(conflicts)} conflicts\n")
                for i, (head_content, incoming_content) in enumerate(conflicts):
                    out.write(f"  Conflict {i+1}:\n")
                    head_lines = head_content.splitlines()
                    inc_lines = incoming_content.splitlines()
                    out.write(f"    HEAD ({len(head_lines)} lines):\n")
                    for line in head_lines:
                        out.write(f"      {line}\n")
                    out.write(f"    INCOMING ({len(inc_lines)} lines):\n")
                    for line in inc_lines:
                        out.write(f"      {line}\n")
            else:
                out.write(f"File: {file} - No conflict markers found?\n")

if __name__ == '__main__':
    analyze_conflicts('c:/SmartFlow_v2_Test')
