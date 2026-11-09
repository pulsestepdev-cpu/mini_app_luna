import os
import sys
import tempfile
from pathlib import Path

# Тесты не трогают /data и не запускают бота
os.environ["DATA_DIR"] = tempfile.mkdtemp(prefix="luna-test-")
os.environ["BOT_TOKEN"] = ""
os.environ["LUNA_NO_DOTENV"] = "1"
os.environ["STATIC_DIR"] = str(Path(tempfile.mkdtemp(prefix="luna-static-")))
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
