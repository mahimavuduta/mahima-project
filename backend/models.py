"""
models.py — SQLAlchemy ORM models for the Academic DSS
"""

from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from database import Base


class Student(Base):
    """Stores registered student accounts."""
    __tablename__ = "students"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String(100), nullable=False)
    email         = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    roll_number   = Column(String(50), default="")
    created_at    = Column(DateTime, default=datetime.utcnow)

    predictions   = relationship("PredictionRecord", back_populates="student")


class PredictionRecord(Base):
    """Stores each prediction made by a student."""
    __tablename__ = "prediction_records"

    id              = Column(Integer, primary_key=True, index=True)
    student_id      = Column(Integer, ForeignKey("students.id"), nullable=False)
    study_hours     = Column(Float, nullable=False)
    attendance      = Column(Float, nullable=False)
    sleep_hours     = Column(Float, nullable=False)
    revision_freq   = Column(Float, nullable=False)
    predicted_marks = Column(Float, nullable=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    student = relationship("Student", back_populates="predictions")
