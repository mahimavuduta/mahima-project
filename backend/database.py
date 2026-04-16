"""
database.py — SQLite database setup using SQLAlchemy
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Use /tmp for SQLite in sandbox; fall back to file-adjacent path on real Mac
_BASE_DIR = os.path.dirname(os.path.abspath(__file__))
_DB_CANDIDATES = [
    "/tmp/academic_dss.db",
    os.path.join(os.path.expanduser("~"), "academic_dss.db"),
    os.path.join(_BASE_DIR, "academic_dss.db"),
]
# Pick the first writable location
_DB_PATH = _DB_CANDIDATES[0]
for _p in _DB_CANDIDATES:
    try:
        import sqlite3 as _sq3
        _conn = _sq3.connect(_p); _conn.execute("PRAGMA journal_mode=WAL"); _conn.close()
        _DB_PATH = _p
        break
    except Exception:
        continue
DATABASE_URL = f"sqlite:///{_DB_PATH}"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def init_db():
    """Create all tables on startup."""
    from models import Student, PredictionRecord  # noqa: F401 — imported for side effect
    Base.metadata.create_all(bind=engine)
    print("✅ Database initialized.")


def get_db():
    """Dependency injector for FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
