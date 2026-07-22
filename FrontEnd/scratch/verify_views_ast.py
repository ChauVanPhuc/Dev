import os
import glob
import subprocess

FRONTEND_DIR = r"m:\ERP\FrontEnd"
WEB_DIR = os.path.join(FRONTEND_DIR, "Web")

def test_all_jsx_compilation():
    files = glob.glob(os.path.join(WEB_DIR, "**", "*.jsx"), recursive=True)
    print(f"Testing compilation of {len(files)} JSX files...")

    failed = 0
    for f in files:
        rel = os.path.relpath(f, FRONTEND_DIR)
        cmd = f'npx esbuild "{f}" --loader=jsx --no-save'
        res = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=FRONTEND_DIR)
        if res.returncode != 0:
            print(f"[SYNTAX ERROR] In {rel}:")
            print(res.stderr[:300])
            failed += 1

    print(f"Compilation test completed. Total files: {len(files)}, Failures: {failed}")

test_all_jsx_compilation()
