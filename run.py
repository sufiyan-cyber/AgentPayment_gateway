import sys
import os
import uvicorn

# Resolve root or backend directory automatically
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if os.path.exists(os.path.join(CURRENT_DIR, "app")):
    BACKEND_DIR = CURRENT_DIR
elif os.path.exists(os.path.join(CURRENT_DIR, "backend", "app")):
    BACKEND_DIR = os.path.join(CURRENT_DIR, "backend")
else:
    BACKEND_DIR = CURRENT_DIR

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

if __name__ == "__main__":
    print(f"[MandateSentinel] Starting server with app directory: {BACKEND_DIR}")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True, app_dir=BACKEND_DIR)
