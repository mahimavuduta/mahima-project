"""
Academic DSS — Complete Backend
Run: python3 server.py
"""
import math, os, hashlib, hmac, secrets, random, json
from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import jwt
from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ── Database ──────────────────────────────────────────────────────────────────
import sqlite3 as _sq3

_BASE = os.path.dirname(os.path.abspath(__file__))
_DB_PATHS = [
    "/tmp/academic_dss.db",
    os.path.join(os.path.expanduser("~"), "academic_dss.db"),
    os.path.join(_BASE, "academic_dss.db"),
]
DB_PATH = _DB_PATHS[0]
for _p in _DB_PATHS:
    try:
        c = _sq3.connect(_p); c.execute("PRAGMA journal_mode=WAL"); c.close()
        DB_PATH = _p; break
    except Exception:
        continue

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Student(Base):
    __tablename__ = "students"
    id          = Column(Integer, primary_key=True, index=True)
    name        = Column(String, nullable=False)
    email       = Column(String, unique=True, index=True, nullable=False)
    password    = Column(String, nullable=False)
    roll_number = Column(String, default="")

class PredictionRecord(Base):
    __tablename__ = "predictions"
    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(Integer)
    study_hours   = Column(Float)
    attendance    = Column(Float)
    sleep_hours   = Column(Float)
    revision_freq = Column(Float)
    predicted_marks = Column(Float)
    grade         = Column(String)
    created_at    = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Academic DSS", version="2.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

SECRET = "academic-dss-2024-secret"
ALGO   = "HS256"
oauth2 = OAuth2PasswordBearer(tokenUrl="/auth/login")

COEF = {"study_hours": 5.007, "attendance": 0.256, "sleep_hours": 1.842, "revision_freq": 3.167}
INTERCEPT = 4.624

@app.on_event("startup")
def startup():
    Base.metadata.create_all(bind=engine)
    print(f"✅ Database ready at {DB_PATH}")

# ── Helpers ───────────────────────────────────────────────────────────────────
def hash_pw(pw: str) -> str:
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", pw.encode(), salt.encode(), 100_000)
    return f"{salt}${key.hex()}"

def check_pw(plain: str, hashed: str) -> bool:
    try:
        salt, key_hex = hashed.split("$")
        key = hashlib.pbkdf2_hmac("sha256", plain.encode(), salt.encode(), 100_000)
        return hmac.compare_digest(key.hex(), key_hex)
    except Exception:
        return False

def make_token(student_id: int) -> str:
    exp = datetime.utcnow() + timedelta(hours=24)
    return jwt.encode({"sub": str(student_id), "exp": exp}, SECRET, algorithm=ALGO)

def get_current_student(token: str = Depends(oauth2), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGO])
        sid = int(payload["sub"])
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    student = db.query(Student).filter(Student.id == sid).first()
    if not student:
        raise HTTPException(status_code=401, detail="Student not found")
    return student

def predict_marks(sh, att, sl, rv):
    v = INTERCEPT + COEF["study_hours"]*sh + COEF["attendance"]*att + \
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

# ── Schemas ───────────────────────────────────────────────────────────────────
class RegisterReq(BaseModel):
    name: str
    email: str
    password: str
    roll_number: Optional[str] = ""

class PredictReq(BaseModel):
    study_hours: float
    attendance: float
    sleep_hours: float
    revision_freq: float

class ReverseReq(BaseModel):
    target_marks: float

class ChatReq(BaseModel):
    message: str
    context: Optional[dict] = {}

# ── Auth Routes ───────────────────────────────────────────────────────────────
@app.post("/auth/register")
def register(req: RegisterReq, db: Session = Depends(get_db)):
    if db.query(Student).filter(Student.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    s = Student(name=req.name, email=req.email,
                password=hash_pw(req.password), roll_number=req.roll_number or "")
    db.add(s); db.commit(); db.refresh(s)
    return {"message": "Registration successful", "student_id": s.id}

@app.post("/auth/login")
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.email == form.username).first()
    if not student or not check_pw(form.password, student.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {
        "access_token": make_token(student.id),
        "token_type": "bearer",
        "student": {"id": student.id, "name": student.name,
                    "email": student.email, "roll_number": student.roll_number}
    }

@app.get("/auth/me")
def me(s = Depends(get_current_student)):
    return {"id": s.id, "name": s.name, "email": s.email, "roll_number": s.roll_number}

# ── Analytics Routes ──────────────────────────────────────────────────────────
@app.post("/predict")
def predict(req: PredictReq, s = Depends(get_current_student), db: Session = Depends(get_db)):
    m = predict_marks(req.study_hours, req.attendance, req.sleep_hours, req.revision_freq)
    g = get_grade(m)
    rec = PredictionRecord(student_id=s.id, study_hours=req.study_hours,
                           attendance=req.attendance, sleep_hours=req.sleep_hours,
                           revision_freq=req.revision_freq, predicted_marks=m, grade=g)
    db.add(rec); db.commit()
    return {
        "predicted_marks": m, "grade": g,
        "breakdown": {
            "study_contribution":    round(COEF["study_hours"]   * req.study_hours,   2),
            "attendance_contribution": round(COEF["attendance"]  * req.attendance,    2),
            "sleep_contribution":    round(COEF["sleep_hours"]   * req.sleep_hours,   2),
            "revision_contribution": round(COEF["revision_freq"] * req.revision_freq, 2),
        }
    }

@app.post("/reverse")
def reverse(req: ReverseReq, s = Depends(get_current_student)):
    t = req.target_marks
    sh  = min(12.0, max(1.0, round((t - INTERCEPT - 0.256*80 - 1.842*7 - 3.167*3) / 5.007, 1)))
    att = min(100.0, max(50.0, round(t * 0.75 + 10, 1)))
    sl  = 7.5
    rv  = min(7.0, max(1.0, round(t / 18, 0)))
    achieved = predict_marks(sh, att, sl, rv)
    return {
        "target_marks": t,
        "recommendations": [
            {"factor": "study_hours",   "recommended_value": sh,  "impact": "High"},
            {"factor": "attendance",    "recommended_value": att, "impact": "Medium"},
            {"factor": "sleep_hours",   "recommended_value": sl,  "impact": "Medium"},
            {"factor": "revision_freq", "recommended_value": rv,  "impact": "High"},
        ],
        "predicted_with_recommendations": achieved
    }

@app.get("/scenario")
def scenario(s = Depends(get_current_student)):
    cases = [
        ("High Effort",   8, 95, 8, 6),
        ("Medium Effort", 5, 75, 7, 3),
        ("Low Effort",    2, 50, 6, 1),
    ]
    result = []
    for name, sh, att, sl, rv in cases:
        m = predict_marks(sh, att, sl, rv)
        result.append({"scenario": name,
                        "inputs": {"study_hours": sh, "attendance": att,
                                   "sleep_hours": sl, "revision_freq": rv},
                        "predicted_marks": m, "grade": get_grade(m)})
    return {"scenarios": result}

@app.get("/memory")
def memory(revision_freq: int = 3, s = Depends(get_current_student)):
    points, rev_days = [], []
    retention = 100.0
    interval  = max(1, round(7 / revision_freq))
    for day in range(31):
        if day > 0:
            retention *= 0.92
            if day % interval == 0:
                retention = min(100.0, retention + 15)
                rev_days.append(day)
        points.append({"day": day, "retention": round(retention, 1)})
    return {"memory_curve": points, "revision_days": rev_days}

@app.get("/history")
def history(s = Depends(get_current_student), db: Session = Depends(get_db)):
    records = db.query(PredictionRecord)\
                .filter(PredictionRecord.student_id == s.id)\
                .order_by(PredictionRecord.created_at.desc()).limit(20).all()
    return {"history": [
        {"id": r.id, "study_hours": r.study_hours, "attendance": r.attendance,
         "sleep_hours": r.sleep_hours, "revision_freq": r.revision_freq,
         "predicted_marks": r.predicted_marks, "grade": r.grade,
         "created_at": r.created_at.strftime("%d/%m/%Y") if r.created_at else ""}
        for r in records
    ]}

@app.post("/chat")
def chat(req: ChatReq, s = Depends(get_current_student)):
    name = s.name
    msg  = req.message.lower()

    if any(w in msg for w in ["how many class", "need to attend", "can i bunk", "miss class"]):
        reply = (f"To meet the **75% attendance** requirement, {name}:\n\n"
                 "Formula: **(attended + x) / (total + x) ≥ 0.75**\n\n"
                 "Example: If you have 60 classes attended out of 80 total, "
                 "you need to attend the next **20 consecutive** classes to recover.\n\n"
                 "Every class you miss now requires **3 future classes** to compensate! 📚")
    elif any(w in msg for w in ["attend", "percentage", "percent", "bunk"]):
        reply = (f"Attendance is crucial, {name}! Most institutions require **75%** minimum.\n\n"
                 "Our model shows attendance has a coefficient of **0.256** — "
                 "each 1% increase adds ~0.26 marks.\n\nTip: Never let it drop below 75%. 📅")
    elif any(w in msg for w in ["study", "hour", "hours", "time"]):
        reply = ("Study hours have the **biggest impact** on marks — coefficient **5.007/hour**!\n\n"
                 "• 2 hrs/day → ~10 mark contribution\n"
                 "• 6 hrs/day → ~30 mark contribution\n"
                 "• 8 hrs/day → ~40 mark contribution\n\n"
                 "Use **Pomodoro**: 25 min focus + 5 min break. 📖")
    elif any(w in msg for w in ["sleep", "rest", "night"]):
        reply = ("Sleep is critically underrated! Coefficient: **1.842/hour**\n\n"
                 "• Aim for **7–8 hours** per night\n"
                 "• Sleep consolidates the day's learning into long-term memory\n"
                 "• Lack of sleep reduces concentration by up to 40% 😴")
    elif any(w in msg for w in ["revision", "revise", "review"]):
        reply = ("Revision frequency coefficient: **3.167/session**!\n\n"
                 "• 1 session/week → ~3.2 marks\n"
                 "• 4 sessions/week → ~12.7 marks\n"
                 "• 7 sessions/week → ~22.2 marks\n\n"
                 "Check the **Memory Curve** panel for the Ebbinghaus optimal revision schedule. 🧠")
    elif any(w in msg for w in ["exam", "tip", "advice", "strategy"]):
        reply = ("Top exam strategies:\n\n"
                 "✅ Start revision **2 weeks** before exams\n"
                 "✅ Use **active recall** — close book, write what you remember\n"
                 "✅ Practice **past papers** under timed conditions\n"
                 "✅ Review **weak topics** first — highest ROI\n"
                 "✅ Sleep well the **night before** the exam 🎯")
    else:
        reply = (f"Hi {name}! I can help you with:\n\n"
                 "• **Attendance** — how many classes to attend\n"
                 "• **Study hours** — optimal daily schedule\n"
                 "• **Sleep** — its role in performance\n"
                 "• **Revision** — best strategies\n"
                 "• **Exam tips** — proven techniques\n\n"
                 "Try: *'How many classes do I need?'* or *'How many hours should I study?'*")
    return {"reply": reply, "student": name}

# ── Serve Frontend ────────────────────────────────────────────────────────────
_HTML_PATH = os.path.join(_BASE, "index.html")

@app.get("/", response_class=HTMLResponse, include_in_schema=False)
@app.get("/{full_path:path}", response_class=HTMLResponse, include_in_schema=False)
def frontend(full_path: str = ""):
    if os.path.exists(_HTML_PATH):
        return HTMLResponse(open(_HTML_PATH).read())
    return HTMLResponse("<h1>Frontend not found</h1>", status_code=404)

# ── Main ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"\n{'='*50}")
    print(f"  🎓 Academic DSS starting on port {port}")
    print(f"  🌍 Open: http://localhost:{port}")
    print(f"{'='*50}\n")
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=False)
