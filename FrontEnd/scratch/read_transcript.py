import os

transcript_path = r'C:\Users\Administrator\.gemini\antigravity-ide\brain\d0084d54-95df-4cc8-a79c-a69c8acf05f5\.system_generated\logs\transcript.jsonl'
if os.path.exists(transcript_path):
    with open(transcript_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    print(f"Total lines: {len(lines)}")
    # Print the last 15 lines
    for idx, line in enumerate(lines[-15:]):
        print(f"Line {len(lines) - 15 + idx}: {line[:350]}")
else:
    print("Transcript not found")
