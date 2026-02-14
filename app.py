# ===== MINI ZALO PRO V4 - SAFE STORAGE =====
# chạy tốt Termux Android 5.0
# python app.py

from flask import Flask, request, send_from_directory, jsonify
from flask_socketio import SocketIO, emit
import os, json, time, threading, shutil

# ---------- BASE PATH (FIX QUAN TRỌNG) ----------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FOLDER = os.path.join(BASE_DIR, "data")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "static", "uploads")
CHAT_FILE = os.path.join(DATA_FOLDER, "chat.json")
USER_FILE = os.path.join(DATA_FOLDER, "users.json")

MAX_MESSAGES = 1000
RATE_LIMIT = 2

# ---------- INIT ----------
app = Flask(__name__)
socketio = SocketIO(app, async_mode="threading", cors_allowed_origins="*")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(DATA_FOLDER, exist_ok=True)

lock = threading.Lock()
online = {}
last_send = {}
ram_chat = []

# ---------- SAFE JSON ----------
def auto_json(path, default):
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default, f, ensure_ascii=False)
        return default
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        shutil.copy(path, path + ".bad")
        with open(path, "w", encoding="utf-8") as f:
            json.dump(default, f, ensure_ascii=False)
        return default

def save_json(path, data):
    try:
        tmp = path + ".tmp"
        with lock:
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False)
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp, path)
    except Exception as e:
        print("SAVE ERROR:", e)

# ---------- LOAD RAM ----------
ram_chat = auto_json(CHAT_FILE, [])
users = auto_json(USER_FILE, {})

# ---------- ROUTES ----------
@app.route("/")
def index():
    return send_from_directory("templates", "index.html")

@app.route("/static/<path:p>")
def static_file(p):
    return send_from_directory("static", p)

@app.route("/upload", methods=["POST"])
def upload():
    if "file" not in request.files:
        return jsonify({"error": "no file"})

    f = request.files["file"]
    name = str(int(time.time())) + "_" + f.filename
    path = os.path.join(UPLOAD_FOLDER, name)
    f.save(path)

    return jsonify({"url": "/static/uploads/" + name})

# ---------- SOCKET ----------
@socketio.on("register")
def register(data):
    u = data.get("username")
    p = data.get("password")

    if not u or not p:
        emit("login_fail", "empty")
        return

    if u in users:
        emit("login_fail", "exists")
        return

    users[u] = p
    save_json(USER_FILE, users)
    emit("login_ok", u)

@socketio.on("login")
def login(data):
    u = data.get("username")
    p = data.get("password")

    if users.get(u) != p:
        emit("login_fail", "wrong")
        return

    online[request.sid] = u
    emit("login_ok", u)
    emit("chat_history", ram_chat)
    socketio.emit("online", list(online.values()))

@socketio.on("disconnect")
def dis():
    if request.sid in online:
        del online[request.sid]
        socketio.emit("online", list(online.values()))

@socketio.on("message")
def message(data):

    if request.sid not in online:
        return

    u = online[request.sid]

    # RATE LIMIT
    if u in last_send and time.time() - last_send[u] < RATE_LIMIT:
        return

    last_send[u] = time.time()

    msg = {
        "username": u,
        "msg": data.get("msg", ""),
        "type": data.get("type", "text"),
        "time": time.strftime("%H:%M")
    }

    ram_chat.append(msg)

    if len(ram_chat) > MAX_MESSAGES:
        ram_chat.pop(0)

    save_json(CHAT_FILE, ram_chat)

    socketio.emit("message", msg)

@socketio.on("private")
def private(data):

    if request.sid not in online:
        return

    frm = online[request.sid]
    to = data.get("to")
    msg = data.get("msg")

    for sid, u in online.items():
        if u == to or u == frm:
            socketio.emit("private", {
                "from": frm,
                "to": to,
                "msg": msg
            }, room=sid)

# ---------- AUTO BACKUP ----------
def backup_loop():
    while True:
        time.sleep(600)
        if os.path.exists(CHAT_FILE):
            shutil.copy(CHAT_FILE, CHAT_FILE + ".bak")
        if os.path.exists(USER_FILE):
            shutil.copy(USER_FILE, USER_FILE + ".bak")

threading.Thread(target=backup_loop, daemon=True).start()

# ---------- RUN ----------
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=8081)
