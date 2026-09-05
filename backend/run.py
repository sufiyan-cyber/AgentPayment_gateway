import sys
import os
import uvicorn

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(CURRENT_DIR, "app")):
    BACKEND_DIR = CURRENT_DIR
else:
    BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if __name__ == "__main__":
    print(f"[MandateSentinel] Starting server with app directory: {BACKEND_DIR}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=False, app_dir=BACKEND_DIR)
