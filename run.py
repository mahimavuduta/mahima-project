#!/usr/bin/env python3
"""
Academic DSS — Standalone Server
No pip install needed! Uses only Python built-in libraries.
Run:  python3 run.py
Then open: http://localhost:3000
"""

import json, os, sqlite3, hashlib, hmac, secrets, time, math
import webbrowser, threading, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ─── Config ────────────────────────────────────────────────────────────────
PORT    = 3000
SECRET  = "academic-dss-2024-mahima"
DB_PATH = os.path.join(os.path.expanduser("~"), "academic_dss.db")

# Model coefficients (Linear Regression R²=0.937)
COEF = {"study_hours": 5.007, "attendance": 0.256,
        "sleep_hours": 1.842, "revision_freq": 3.167}
IC   = 4.624

# ─── Database ──────────────────────────────────────────────────────────────
def get_db():
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    return db

def init_db():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            roll_number TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            study_hours REAL, attendance REAL,
            sleep_hours REAL, revision_freq REAL,
            predicted_marks REAL, grade TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        );
    """)
    db.commit(); db.close()
    print(f"✅ Database ready at {DB_PATH}")

# ─── Auth helpers ──────────────────────────────────────────────────────────
def hash_pw(pw):
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000)
    return f"{salt}${key.hex()}"

def check_pw(plain, hashed):
    try:
        salt, key_hex = hashed.split("$")
        key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 100_000)
        return hmac.compare_digest(key.hex(), key_hex)
    except:
        return False

def make_token(uid):
    exp = str(int(time.time()) + 86400)
    msg = f"{uid}:{exp}"
    sig = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
    import base64
    token = base64.b64encode(f"{msg}:{sig}".encode()).decode()
    return token

def verify_token(token):
    try:
        import base64
        decoded = base64.b64decode(token.encode()).decode()
        uid, exp, sig = decoded.rsplit(":", 2)
        if int(exp) < time.time():
            return None
        msg = f"{uid}:{exp}"
        expected = hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        return int(uid)
    except:
        return None

# ─── Analytics helpers ─────────────────────────────────────────────────────
def calc_marks(sh, att, sl, rv):
    v = IC + COEF["study_hours"]*sh + COEF["attendance"]*att + \
        COEF["sleep_hours"]*sl + COEF["revision_freq"]*rv
    return round(min(100.0, max(0.0, v)), 2)

def get_grade(m):
    if m >= 90: return "O (Outstanding)"
    if m >= 80: return "A+ (Excellent)"
    if m >= 70: return "A (Very Good)"
    if m >= 60: return "B+ (Good)"
    if m >= 50: return "B (Above Average)"
    if m >= 40: return "C (Pass)"
    return "F (Fail)"

# ─── Chatbot ───────────────────────────────────────────────────────────────
def chatbot(msg, name):
    m = msg.lower()
    if any(w in m for w in ["how many class","need to attend","can i bunk","miss class"]):
        return (f"To meet **75% attendance**, {name}:\n\n"
                "Formula: **(attended + x) / (total + x) ≥ 0.75**\n\n"
                "Every class you miss now requires **3 future classes** to compensate! 📚")
    if any(w in m for w in ["attend","percentage","percent","bunk"]):
        return ("Attendance is crucial! Minimum **75%** required.\n\n"
                "Our model: each 1% attendance increase adds ~0.26 marks.\n\n"
                "Tip: Never let it drop below 75%! 📅")
    if any(w in m for w in ["study","hour","hours"]):
        return ("Study hours have the **biggest impact** — coefficient **5.007/hour**!\n\n"
                "• 2 hrs/day → ~10 mark contribution\n"
                "• 6 hrs/day → ~30 mark contribution\n"
                "• 8 hrs/day → ~40 mark contribution\n\n"
                "Use Pomodoro: 25 min focus + 5 min break 📖")
    if any(w in m for w in ["sleep","rest","night"]):
        return ("Sleep coefficient: **1.842/hour**!\n\n"
                "• Aim for 7–8 hours per night\n"
                "• Sleep consolidates the day's learning\n"
                "• Lack of sleep cuts concentration by 40% 😴")
    if any(w in m for w in ["revision","revise","review"]):
        return ("Revision coefficient: **3.167/session**!\n\n"
                "• 1 session/week → ~3.2 marks\n"
                "• 4 sessions/week → ~12.7 marks\n\n"
                "Check the Memory Curve panel for the Ebbinghaus schedule 🧠")
    if any(w in m for w in ["exam","tip","advice","strategy"]):
        return ("Top exam strategies:\n\n"
                "✅ Start revision 2 weeks before\n"
                "✅ Active recall: close book, write from memory\n"
                "✅ Practice past papers under timed conditions\n"
                "✅ Review weak topics first\n"
                "✅ Sleep well the night before 🎯")
    return (f"Hi {name}! I can help with:\n\n"
            "• **Attendance** — classes needed, bunk limit\n"
            "• **Study hours** — optimal schedule\n"
            "• **Sleep** — impact on performance\n"
            "• **Revision** — best strategies\n"
            "• **Exam tips** — proven techniques\n\n"
            "Try: 'How many classes do I need?' 🎓")

# ─── HTTP Handler ──────────────────────────────────────────────────────────
HTML_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend", "index.html")

class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        pass  # Suppress noisy logs

    def send_json(self, data, code=200):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(body)

    def send_html(self, html, code=200):
        body = html.encode()
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def get_token(self):
        auth = self.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            return auth[7:]
        return None

    def get_student(self):
        token = self.get_token()
        if not token:
            return None
        uid = verify_token(token)
        if not uid:
            return None
        db = get_db()
        row = db.execute("SELECT * FROM students WHERE id=?", (uid,)).fetchone()
        db.close()
        return dict(row) if row else None

    def read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode()
        ct = self.headers.get("Content-Type", "")
        if "application/json" in ct:
            try:
                return json.loads(raw)
            except:
                return {}
        # Form-encoded
        result = {}
        for pair in raw.split("&"):
            if "=" in pair:
                k, v = pair.split("=", 1)
                from urllib.parse import unquote_plus
                result[unquote_plus(k)] = unquote_plus(v)
        return result

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        params = parse_qs(urlparse(self.path).query)

        # ── Frontend ──
        if path in ("/", "") or not path.startswith("/auth") and not path.startswith("/predict") \
                and not path.startswith("/reverse") and not path.startswith("/scenario") \
                and not path.startswith("/memory") and not path.startswith("/history") \
                and not path.startswith("/chat"):
            if os.path.exists(HTML_FILE):
                self.send_html(open(HTML_FILE).read())
            else:
                self.send_html("<h1>index.html not found</h1>", 404)
            return

        # ── Auth: me ──
        if path == "/auth/me":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            self.send_json({"id": s["id"], "name": s["name"],
                            "email": s["email"], "roll_number": s["roll_number"]})
            return

        # ── Scenario ──
        if path == "/scenario":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            cases = [("High Effort",8,95,8,6),("Medium Effort",5,75,7,3),("Low Effort",2,50,6,1)]
            result = []
            for name, sh, att, sl, rv in cases:
                m = calc_marks(sh, att, sl, rv)
                result.append({"scenario": name,
                                "inputs": {"study_hours": sh, "attendance": att,
                                           "sleep_hours": sl, "revision_freq": rv},
                                "predicted_marks": m, "grade": get_grade(m)})
            self.send_json({"scenarios": result}); return

        # ── Memory ──
        if path == "/memory":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            freq = int(params.get("revision_freq", ["3"])[0])
            pts = []

            # Pre-compute revision days by evenly spacing `freq` sessions/week over 30 days
            # This correctly distinguishes freq=3 vs freq=4 vs freq=7 etc.
            total_revs   = max(1, round(freq * 30 / 7))
            rev_days_set = set()
            for i in range(1, total_revs + 1):
                d = round(i * 7 / freq)
                if 1 <= d <= 30:
                    rev_days_set.add(d)
            rev_days = sorted(rev_days_set)

            # Ebbinghaus exponential forgetting: R(t) = 100 × e^(-t / S)
            # S = memory stability in days.  After each revision S grows (spaced repetition):
            #   freq=1: day-7 trough ~14% → revision → day-14 trough ~33% → 54% → 71% …
            #   freq=3: stabilises above ~85% within the first week
            #   freq=7: almost no forgetting — curve stays near 100%
            stability   = 3.5    # initial S: gives ~75% day-1, ~14% day-7 (textbook Ebbinghaus)
            last_review = 0
            retention   = 100.0

            for day in range(31):
                if day == 0:
                    retention = 100.0
                else:
                    days_since = day - last_review
                    retention  = 100.0 * math.exp(-days_since / stability)
                    if day in rev_days_set:
                        stability   = min(stability * 1.8, 90.0)  # each review consolidates memory
                        retention   = 100.0                        # active recall resets to full
                        last_review = day
                pts.append({"day": day, "retention": round(retention, 1)})
            self.send_json({"memory_curve": pts, "revision_days": rev_days}); return

        # ── History ──
        if path == "/history":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            db = get_db()
            rows = db.execute(
                "SELECT * FROM predictions WHERE student_id=? ORDER BY id DESC LIMIT 20",
                (s["id"],)).fetchall()
            db.close()
            self.send_json({"history": [
                {"id": r["id"], "study_hours": r["study_hours"],
                 "attendance": r["attendance"], "sleep_hours": r["sleep_hours"],
                 "revision_freq": r["revision_freq"],
                 "predicted_marks": r["predicted_marks"], "grade": r["grade"],
                 "created_at": r["created_at"][:10] if r["created_at"] else ""}
                for r in rows]}); return

        self.send_json({"detail": "Not found"}, 404)

    def do_POST(self):
        path = urlparse(self.path).path
        body = self.read_body()

        # ── Register ──
        if path == "/auth/register":
            name  = body.get("name", "").strip()
            email = body.get("email", "").strip().lower()
            pw    = body.get("password", "")
            roll  = body.get("roll_number", "")
            if not name or not email or not pw:
                self.send_json({"detail": "Name, email and password are required"}, 400); return
            if len(pw) < 6:
                self.send_json({"detail": "Password must be at least 6 characters"}, 400); return
            db = get_db()
            existing = db.execute("SELECT id FROM students WHERE email=?", (email,)).fetchone()
            if existing:
                db.close()
                self.send_json({"detail": "Email already registered"}, 400); return
            cur = db.execute(
                "INSERT INTO students (name, email, password, roll_number) VALUES (?,?,?,?)",
                (name, email, hash_pw(pw), roll))
            db.commit(); new_id = cur.lastrowid; db.close()
            self.send_json({"message": "Registration successful", "student_id": new_id}); return

        # ── Login ──
        if path == "/auth/login":
            email = body.get("username", body.get("email", "")).strip().lower()
            pw    = body.get("password", "")
            db = get_db()
            row = db.execute("SELECT * FROM students WHERE email=?", (email,)).fetchone()
            db.close()
            if not row or not check_pw(pw, row["password"]):
                self.send_json({"detail": "Invalid email or password"}, 401); return
            s = dict(row)
            token = make_token(s["id"])
            self.send_json({
                "access_token": token, "token_type": "bearer",
                "student": {"id": s["id"], "name": s["name"],
                            "email": s["email"], "roll_number": s["roll_number"]}
            }); return

        # ── Predict ──
        if path == "/predict":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            sh  = float(body.get("study_hours",   6))
            att = float(body.get("attendance",    80))
            sl  = float(body.get("sleep_hours",    7))
            rv  = float(body.get("revision_freq",  4))
            m   = calc_marks(sh, att, sl, rv)
            g   = get_grade(m)
            db  = get_db()
            db.execute(
                "INSERT INTO predictions (student_id,study_hours,attendance,sleep_hours,revision_freq,predicted_marks,grade) VALUES (?,?,?,?,?,?,?)",
                (s["id"], sh, att, sl, rv, m, g))
            db.commit(); db.close()
            self.send_json({
                "predicted_marks": m, "grade": g,
                "breakdown": {
                    "study_contribution":    round(COEF["study_hours"]   * sh,  2),
                    "attendance_contribution": round(COEF["attendance"]  * att, 2),
                    "sleep_contribution":    round(COEF["sleep_hours"]   * sl,  2),
                    "revision_contribution": round(COEF["revision_freq"] * rv,  2),
                }
            }); return

        # ── Reverse ──
        if path == "/reverse":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            t   = float(body.get("target_marks", 80))
            sh  = min(12.0, max(1.0, round((t - IC - 0.256*80 - 1.842*7 - 3.167*3) / 5.007, 1)))
            att = min(100.0, max(50.0, round(t * 0.75 + 10, 1)))
            sl  = 7.5
            rv  = min(7.0, max(1.0, round(t / 18, 0)))
            achieved = calc_marks(sh, att, sl, rv)
            self.send_json({
                "target_marks": t,
                "recommendations": [
                    {"factor": "study_hours",   "recommended_value": sh,  "impact": "High"},
                    {"factor": "attendance",    "recommended_value": att, "impact": "Medium"},
                    {"factor": "sleep_hours",   "recommended_value": sl,  "impact": "Medium"},
                    {"factor": "revision_freq", "recommended_value": rv,  "impact": "High"},
                ],
                "predicted_with_recommendations": achieved
            }); return

        # ── Chat ──
        if path == "/chat":
            s = self.get_student()
            if not s:
                self.send_json({"detail": "Unauthorized"}, 401); return
            msg   = body.get("message", "")
            reply = chatbot(msg, s["name"])
            self.send_json({"reply": reply, "student": s["name"]}); return

        self.send_json({"detail": "Not found"}, 404)


# ─── Main ──────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    print("╔══════════════════════════════════════════╗")
    print("║   🎓  Academic DSS — Starting Up         ║")
    print("╚══════════════════════════════════════════╝")
    print()

    init_db()

    server = HTTPServer(("0.0.0.0", PORT), Handler)

    print(f"✅  Server running at http://localhost:{PORT}")
    print()
    print("  ⚠️  Keep this window open while using the app")
    print("  Press Ctrl+C to stop")
    print()

    # Open browser after short delay
    def open_browser():
        time.sleep(1.5)
        webbrowser.open(f"http://localhost:{PORT}")
    threading.Thread(target=open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped. Goodbye! 👋")
