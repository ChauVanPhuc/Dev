# -*- coding: utf-8 -*-
import json

log_path = r"C:\Users\Administrator\.gemini\antigravity\brain\77475b35-6110-487f-b0eb-bb72a862b2f6\.system_generated\logs\overview.txt"
output_path = r"c:\SmartFlow_v2\BackEnd\scripts\server_pasted.js"

with open(log_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            if data.get("step_index") == 532:
                content = data.get("content", "")
                # Extract the code between <USER_REQUEST> and </USER_REQUEST>
                if "<USER_REQUEST>" in content:
                    code = content.split("<USER_REQUEST>")[1].split("</USER_REQUEST>")[0].strip()
                    with open(output_path, "w", encoding="utf-8") as out:
                        out.write(code)
                    print("Successfully extracted server.js!")
                    break
        except Exception as e:
            pass
