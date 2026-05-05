import subprocess
import sys
from pathlib import Path


def test_export_openapi_script_runs():
    root = Path(__file__).resolve().parents[1]
    script = root / "scripts" / "export_openapi.py"
    r = subprocess.run([sys.executable, str(script)], cwd=str(root), capture_output=True, text=True)
    assert r.returncode == 0, r.stderr + r.stdout
