"""
main.py — Academic Decision Support System — FastAPI Backend
Run: uvicorn main:app --reload --port 8000
"""

import math, os, hashlib, hmac, secrets, random
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
import jwt

from database import init_db, get_db, SessionLocal
from models import Student, PredictionRecord

# ── App setup ─────────────────────────────────────────────────────────────────
app = FastAPI(title="Academic DSS API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Auth config ───────────────────────────────────────────────────────────────
SECRET_KEY   = "academic-dss-secret-key-2024"
ALGORITHM    = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

# ── Linear Regression coefficients (pre-trained, R²=0.937) ────────────────────
# Eliminates scikit-learn dependency — same model, same results
COEF = {
    "study_hours":   5.007,
    "attendance":    0.256,
    "sleep_hours":   1.842,
    "revision_freq": 3.167,
}
INTERCEPT = 4.624

# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_event():
    init_db()

# ══════════════════════════════════════════════════════════════════════════════
# Pydantic schemas
# ══════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    roll_number: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    student: dict

class PredictRequest(BaseModel):
    study_hours: float
    attendance: float
    sleep_hours: float
    revision_freq: float

class ReverseRequest(BaseModel):
    target_marks: float

class ChatRequest(BaseModel):
    message: str
    context: Optional[dict] = None   # {attendance, study_hours, total_classes, attended_classes}

# ══════════════════════════════════════════════════════════════════════════════
# Auth helpers
# ══════════════════════════════════════════════════════════════════════════════

def hash_password(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 (Python built-in, no extra packages)."""
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}${key.hex()}"

def verify_password(plain: str, hashed: str) -> bool:
    """Verify password against stored hash."""
    try:
        salt, key_hex = hashed.split("$")
        key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 260000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_student(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        student_id = payload.get("sub")
        if student_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    db = SessionLocal()
    student = db.query(Student).filter(Student.id == int(student_id)).first()
    db.close()
    if not student:
        raise HTTPException(status_code=401, detail="Student not found")
    return student

# ══════════════════════════════════════════════════════════════════════════════
# Auth routes
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/auth/register", summary="Register a new student")
def register(req: RegisterRequest):
    db = SessionLocal()
    existing = db.query(Student).filter(Student.email == req.email).first()
    if existing:
        db.close()
        raise HTTPException(status_code=400, detail="Email already registered")

    student = Student(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
        roll_number=req.roll_number or "",
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    db.close()
    return {"message": "Registration successful", "student_id": student.id}

@app.post("/auth/login", response_model=TokenResponse, summary="Login student")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    db = SessionLocal()
    student = db.query(Student).filter(Student.email == form_data.username).first()
    db.close()
    if not student or not verify_password(form_data.password, student.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(student.id)})
    return {
        "access_token": token,
        "token_type": "bearer",
        "student": {
            "id": student.id,
            "name": student.name,
            "email": student.email,
            "roll_number": student.roll_number,
        },
    }

@app.get("/auth/me", summary="Get current student profile")
def get_me(current_student: Student = Depends(get_current_student)):
    return {
        "id": current_student.id,
        "name": current_student.name,
        "email": current_student.email,
        "roll_number": current_student.roll_number,
        "created_at": current_student.created_at,
    }

# ══════════════════════════════════════════════════════════════════════════════
# Core analytics routes
# ══════════════════════════════════════════════════════════════════════════════

def _predict_marks(study_hours, attendance, sleep_hours, revision_freq) -> float:
    """Linear regression prediction using pre-trained coefficients. Result clamped to [0, 100]."""
    raw = (
        INTERCEPT
        + COEF["study_hours"]   * study_hours
        + COEF["attendance"]    * attendance
        + COEF["sleep_hours"]   * sleep_hours
        + COEF["revision_freq"] * revision_freq
    )
    return round(max(0.0, min(100.0, raw)), 2)


@app.post("/predict", summary="Predict marks from student inputs")
def predict(req: PredictRequest, current_student: Student = Depends(get_current_student)):
    """
    Returns predicted marks and saves the record to the student's history.
    """
    predicted = _predict_marks(
        req.study_hours, req.attendance, req.sleep_hours, req.revision_freq
    )

    # Persist to DB
    db = SessionLocal()
    record = PredictionRecord(
        student_id=current_student.id,
        study_hours=req.study_hours,
        attendance=req.attendance,
        sleep_hours=req.sleep_hours,
        revision_freq=req.revision_freq,
        predicted_marks=predicted,
    )
    db.add(record)
    db.commit()
    db.close()

    grade = _grade(predicted)
    return {
        "predicted_marks": predicted,
        "grade": grade,
        "breakdown": {
            "study_contribution": round(req.study_hours * 5.007, 2),
            "attendance_contribution": round(req.attendance * 0.256, 2),
            "sleep_contribution": round(req.sleep_hours * 1.842, 2),
            "revision_contribution": round(req.revision_freq * 3.167, 2),
        },
    }


@app.post("/reverse", summary="Reverse prediction: find inputs for target marks")
def reverse(req: ReverseRequest, current_student: Student = Depends(get_current_student)):
    """
    Rule-based optimizer: given a target score, compute the minimum
    study_hours, attendance, and revision_freq needed (sleep held at 7h).
    """
    target = float(req.target_marks)
    if not 0 <= target <= 100:
        raise HTTPException(status_code=400, detail="Target marks must be 0–100")

    # Hold sleep at 7h (recommended), solve for the rest using pre-trained coefficients
    sleep_fixed   = 7.0
    intercept     = INTERCEPT
    coef_study    = COEF["study_hours"]
    coef_attend   = COEF["attendance"]
    coef_sleep    = COEF["sleep_hours"]
    coef_revision = COEF["revision_freq"]

    remaining = target - intercept - coef_sleep * sleep_fixed

    # Strategy: balanced distribution (40% study, 30% attendance, 30% revision)
    study_needed     = min(10.0, max(0.0, round((remaining * 0.40) / coef_study, 2)))
    revision_needed  = min(7.0,  max(0.0, round((remaining * 0.30) / coef_revision, 2)))
    attend_needed    = min(100.0, max(0.0, round(
        (remaining - coef_study * study_needed - coef_revision * revision_needed) / coef_attend, 2
    )))

    # Verify and iterate if needed
    achieved = _predict_marks(study_needed, attend_needed, sleep_fixed, revision_needed)
    if achieved < target - 2:
        study_needed = min(10.0, study_needed + 1.0)
        achieved = _predict_marks(study_needed, attend_needed, sleep_fixed, revision_needed)

    return {
        "target_marks": target,
        "required_study_hours": study_needed,
        "required_attendance": attend_needed,
        "required_revision_freq": revision_needed,
        "sleep_hours_recommended": sleep_fixed,
        "achievable_marks": round(achieved, 2),
        "tips": _prescriptive_tips(study_needed, attend_needed, revision_needed),
    }


@app.get("/scenario", summary="3-scenario comparison: High / Medium / Low effort")
def scenario(current_student: Student = Depends(get_current_student)):
    """Returns predicted marks for high, medium, and low effort profiles."""
    scenarios = {
        "High Effort": {
            "study_hours": 8, "attendance": 95, "sleep_hours": 8, "revision_freq": 6,
        },
        "Medium Effort": {
            "study_hours": 5, "attendance": 75, "sleep_hours": 7, "revision_freq": 3,
        },
        "Low Effort": {
            "study_hours": 2, "attendance": 50, "sleep_hours": 6, "revision_freq": 1,
        },
    }

    results = []
    for label, vals in scenarios.items():
        marks = _predict_marks(
            vals["study_hours"], vals["attendance"], vals["sleep_hours"], vals["revision_freq"]
        )
        results.append({
            "scenario": label,
            "inputs": vals,
            "predicted_marks": marks,
            "grade": _grade(marks),
        })
    return {"scenarios": results}


@app.get("/memory", summary="Forgetting curve & revision recovery time-series")
def memory(
    revision_freq: float = 3.0,
    current_student: Student = Depends(get_current_student)
):
    """
    Simulates the Ebbinghaus forgetting curve over 30 days.
    Every day without revision, retention decays. Revision events restore it.
    """
    days         = 30
    base_retention = 100.0          # full retention at day 0
    decay_rate   = 0.08             # ~8% per day without revision
    recovery     = 15.0             # % restored per revision session

    # Revision days spread across the period based on frequency
    total_revisions = int(revision_freq * (days / 7))
    revision_days = set(
        random.sample(range(1, days + 1), min(total_revisions, days))
    ) if total_revisions > 0 else set()

    data_points = []
    retention = base_retention

    for day in range(0, days + 1):
        if day in revision_days:
            retention = min(100.0, retention + recovery)
        if day > 0:
            retention = max(0.0, retention * (1 - decay_rate))
        data_points.append({"day": day, "retention": round(retention, 2)})

    return {
        "days": days,
        "revision_freq": revision_freq,
        "revision_days": sorted(revision_days),
        "data": data_points,
    }


@app.get("/history", summary="Get student's prediction history")
def get_history(current_student: Student = Depends(get_current_student)):
    db = SessionLocal()
    records = (
        db.query(PredictionRecord)
        .filter(PredictionRecord.student_id == current_student.id)
        .order_by(PredictionRecord.created_at.desc())
        .limit(20)
        .all()
    )
    db.close()
    return {
        "history": [
            {
                "id": r.id,
                "study_hours": r.study_hours,
                "attendance": r.attendance,
                "sleep_hours": r.sleep_hours,
                "revision_freq": r.revision_freq,
                "predicted_marks": r.predicted_marks,
                "created_at": r.created_at,
            }
            for r in records
        ]
    }


# ══════════════════════════════════════════════════════════════════════════════
# Chatbot route
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/chat", summary="Rule-based academic chatbot")
def chat(req: ChatRequest, current_student: Student = Depends(get_current_student)):
    """
    Handles student queries about attendance, study plans, revision, sleep, etc.
    """
    msg  = req.message.lower().strip()
    ctx  = req.context or {}
    name = current_student.name.split()[0]

    response = _chatbot_engine(msg, ctx, name)
    return {"reply": response, "student": name}


# ══════════════════════════════════════════════════════════════════════════════
# Helper functions
# ══════════════════════════════════════════════════════════════════════════════

def _grade(marks: float) -> str:
    if marks >= 90: return "O (Outstanding)"
    if marks >= 80: return "A+ (Excellent)"
    if marks >= 70: return "A (Very Good)"
    if marks >= 60: return "B+ (Good)"
    if marks >= 50: return "B (Above Average)"
    if marks >= 40: return "C (Pass)"
    return "F (Fail)"


def _prescriptive_tips(study: float, attend: float, revision: float) -> list:
    tips = []
    if study >= 7:
        tips.append("📚 High study hours needed — break into focused 90-min Pomodoro blocks.")
    elif study >= 4:
        tips.append("📖 Moderate study load — consistency matters more than cramming.")
    else:
        tips.append("✅ Study load is manageable — stay regular and avoid last-minute prep.")

    if attend >= 85:
        tips.append("🏫 High attendance required — don't miss classes; they'll count.")
    elif attend >= 70:
        tips.append("📝 Aim for 75%+ attendance to stay on track.")
    else:
        tips.append("⚠️ Even minimum attendance will help significantly.")

    if revision >= 5:
        tips.append("🔁 Daily revision is key — use flashcards and spaced repetition.")
    elif revision >= 3:
        tips.append("📅 Revise at least every other day to beat the forgetting curve.")
    else:
        tips.append("🗒️ Even 1–2 revisions per week will improve retention noticeably.")
    return tips


def _chatbot_engine(msg: str, ctx: dict, name: str) -> str:
    """
    Rule-based chatbot covering the most common academic queries.
    """

    # ── Attendance calculations ───────────────────────────────────────────────
    if any(k in msg for k in ["attendance", "class", "bunk", "miss", "present", "absent"]):

        total    = ctx.get("total_classes", None)
        attended = ctx.get("attended_classes", None)
        att_pct  = ctx.get("attendance", None)

        # If they ask how many classes to attend to reach 75%
        if "75" in msg or "minimum" in msg or "required" in msg or "need" in msg:
            if total and attended:
                t, a = int(total), int(attended)
                current_pct = (a / t) * 100
                if current_pct >= 75:
                    return (
                        f"Great news, {name}! You already have **{current_pct:.1f}% attendance** "
                        f"({a}/{t} classes). You can miss up to "
                        f"**{int(t - a/0.75) if a/0.75 < t else 0} more classes** while staying above 75%. "
                        "Keep it up! 🎉"
                    )
                else:
                    # x more classes needed: (a + x) / (t + x) >= 0.75
                    # 0.75(t + x) = a + x  →  0.75t + 0.75x = a + x  →  0.75t - a = 0.25x
                    needed = math.ceil((0.75 * t - a) / 0.25)
                    return (
                        f"Hi {name}! Currently you have **{current_pct:.1f}% attendance** ({a}/{t} classes). "
                        f"To reach 75%, you need to attend at least **{needed} more consecutive classes**. "
                        "Try not to miss any until then! 📅"
                    )
            elif att_pct:
                p = float(att_pct)
                if p >= 75:
                    return f"You're at **{p:.1f}% attendance** — above the 75% minimum. ✅ You're safe for now!"
                else:
                    deficit = 75 - p
                    return (
                        f"Your attendance is at **{p:.1f}%**, which is **{deficit:.1f}% below** the 75% threshold. "
                        "Share your total and attended classes count in the context panel and I can calculate the exact number of classes you need to attend! 📊"
                    )
            else:
                return (
                    f"Hi {name}! To calculate attendance, I need your total classes and classes attended. "
                    "You can set these in the simulation panel, or just tell me — e.g., *'I've attended 42 out of 60 classes'*. 😊"
                )

        if "bunk" in msg or "skip" in msg or "miss" in msg or "how many can" in msg:
            if total and attended:
                t, a = int(total), int(attended)
                max_miss = max(0, int(a - 0.75 * t))
                return (
                    f"With {a}/{t} classes attended ({(a/t)*100:.1f}%), "
                    f"you can afford to miss at most **{max_miss} more class(es)** and still stay at 75%. "
                    "Be careful — every class counts! ⚠️"
                )
            return (
                f"To figure out how many classes you can skip, {name}, "
                "I need your total classes and attended count. Share those and I'll calculate instantly! 🧮"
            )

        return (
            f"Attendance is crucial, {name}! Most institutions require a minimum of **75%**. "
            "Low attendance directly reduces your predicted marks in our model. "
            "Try to attend every class — even a single missed lecture can snowball. 📚\n\n"
            "You can ask me:\n• *How many classes do I need to attend?*\n• *How many can I miss?*\n• *My attendance is X%, am I safe?*"
        )

    # ── Study hours ───────────────────────────────────────────────────────────
    if any(k in msg for k in ["study", "hours", "prepare", "preparation", "how much", "how long"]):
        if "low" in msg or "less" in msg or "not studying" in msg:
            return (
                f"Don't worry, {name}! Even **2–3 hours of focused study daily** beats 8 hours of distracted reading. "
                "Try:\n• 🍅 Pomodoro: 25 min study + 5 min break\n"
                "• 📝 Active recall over re-reading\n"
                "• 🗂️ Mind maps to connect concepts\n\n"
                "Start small — 1 extra hour today makes a big difference over a semester!"
            )
        return (
            f"For strong performance, {name}, aim for **5–7 focused study hours per day** before exams, "
            "or **2–3 hours daily** throughout the semester. \n\n"
            "Quality > Quantity: active recall, practice problems, and teaching concepts to yourself "
            "are the most effective techniques. 🎯"
        )

    # ── Revision ──────────────────────────────────────────────────────────────
    if any(k in msg for k in ["revis", "forget", "memory", "remember", "recall", "review"]):
        return (
            f"Great question, {name}! The brain forgets ~50% of new info within 24 hours (Ebbinghaus forgetting curve). "
            "Counter it with **spaced repetition**:\n\n"
            "• Day 1: First study\n"
            "• Day 2: Quick review (10 min)\n"
            "• Day 4: Review again\n"
            "• Day 7: Weekly revision\n"
            "• Day 14 & 30: Consolidate\n\n"
            "Even **3–4 revision sessions per week** can boost your predicted marks significantly. "
            "Check the Memory Curve chart to visualize this! 📈"
        )

    # ── Sleep ─────────────────────────────────────────────────────────────────
    if any(k in msg for k in ["sleep", "rest", "tired", "fatigue", "night"]):
        return (
            f"Sleep is seriously underrated, {name}! 🌙 Research shows that **7–9 hours of sleep** improves:\n"
            "• Memory consolidation (your brain stores what you studied!)\n"
            "• Focus and concentration during study\n"
            "• Problem-solving and exam performance\n\n"
            "In our model, sleep contributes to your predicted marks. Pulling all-nighters before exams "
            "is counterproductive — a well-rested brain outperforms a sleep-deprived one every time."
        )

    # ── Marks / score ─────────────────────────────────────────────────────────
    if any(k in msg for k in ["mark", "score", "grade", "pass", "fail", "80", "90", "target"]):
        if "fail" in msg or "failing" in msg:
            return (
                f"Don't give up, {name}! 💪 Even with current low marks, there's always a path forward:\n\n"
                "1. Use the **Prescriptive Analytics** tab — enter your target marks and get a personalized plan\n"
                "2. Increase **study hours** first — it has the highest impact in our model\n"
                "3. Attend all remaining classes — every % of attendance counts\n"
                "4. Revise daily, even for 30 minutes\n\n"
                "Consistent effort in the final stretch can dramatically change your outcome! 🚀"
            )
        return (
            f"To improve your marks, {name}, focus on the factors that matter most:\n\n"
            "1. 📚 **Study hours** (highest impact)\n"
            "2. 🔁 **Revision frequency** (beats forgetting)\n"
            "3. 🏫 **Attendance** (keeps you in sync)\n"
            "4. 😴 **Sleep** (boosts retention)\n\n"
            "Use the **Prescriptive Analytics** tab to set a target score and get exact required values! 🎯"
        )

    # ── Exam tips ─────────────────────────────────────────────────────────────
    if any(k in msg for k in ["exam", "test", "tips", "strategy", "trick", "help"]):
        return (
            f"Here are my top exam tips for you, {name}! 🧠\n\n"
            "**Before the exam:**\n"
            "• Revise key formulas/concepts the night before (don't cram)\n"
            "• Sleep 7–8 hours — seriously, it helps\n"
            "• Eat a light meal before the exam\n\n"
            "**During the exam:**\n"
            "• Read all questions first (2 min)\n"
            "• Attempt easy questions first for confidence\n"
            "• Show all working — partial marks count\n"
            "• Don't spend too long on one question\n\n"
            "**After the exam:**\n"
            "• Revisit topics you found hard — don't repeat the same mistakes 📝"
        )

    # ── Motivation ────────────────────────────────────────────────────────────
    if any(k in msg for k in ["motivat", "stress", "anxious", "worried", "overwhelm", "depress", "sad", "frustrated"]):
        return (
            f"I hear you, {name}. Academic pressure is real. 💙\n\n"
            "Remember: **progress > perfection**. Even small consistent efforts compound over time.\n\n"
            "Try this: for the next 3 days, commit to just **one hour of focused study** and **one full day of classes**. "
            "That's it. See how it feels.\n\n"
            "And please take care of yourself — talk to a friend, take breaks, and get proper sleep. "
            "Your health matters more than any exam. 🌟"
        )

    # ── Greetings ─────────────────────────────────────────────────────────────
    if any(k in msg for k in ["hi", "hello", "hey", "good morning", "good evening", "hola"]):
        return (
            f"Hello {name}! 👋 I'm your Academic Assistant. I can help you with:\n\n"
            "• 🏫 **Attendance** — how many classes to attend or how many you can miss\n"
            "• 📚 **Study planning** — how many hours you need\n"
            "• 🔁 **Revision strategies** — beat the forgetting curve\n"
            "• 😴 **Sleep** — why it matters for your grades\n"
            "• 🎯 **Exam tips** — strategies for better performance\n\n"
            "What would you like to know?"
        )

    # ── Default ───────────────────────────────────────────────────────────────
    return (
        f"I'm not sure I understood that, {name}. 🤔 I can help with:\n\n"
        "• **Attendance** (how many classes to attend, bunk limits)\n"
        "• **Study hours** (how much to study)\n"
        "• **Revision** (strategies to remember better)\n"
        "• **Sleep** (its role in performance)\n"
        "• **Exam tips** and motivation\n\n"
        "Try asking: *'How many classes do I need to attend?'* or *'Give me study tips'*"
    )


# ── Serve React frontend (must be LAST — catch-all) ───────────────────────────
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

_STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")

if os.path.exists(_STATIC_DIR):
    app.mount("/assets", StaticFiles(directory=os.path.join(_STATIC_DIR, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_frontend(full_path: str):
        """Serve the React app for any non-API route."""
        return FileResponse(os.path.join(_STATIC_DIR, "index.html"))
