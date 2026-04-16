# 📊 Predictive Academic Analytics and Visualization
### Academic Decision Support System (DSS)

> A web-based intelligent system that predicts student academic performance using Machine Learning and provides personalized prescriptive recommendations — with **zero external dependencies**.

---

## 👥 Team

| Name | Roll Number |
|------|-------------|
| Priya Ponugoti | 160123733167 |
| Roshini Yanamala | 160123733169 |
| Vuduta Mahima | 160123733177 |

**Guide:** Smt. S. Durga Devi, Asst. Professor, Dept. of CSE  
**Institution:** Chaitanya Bharathi Institute of Technology (Autonomous), Hyderabad  
**Year:** 2025–2026

---

## 🚀 Features

| Module | Description |
|--------|-------------|
| 📈 Predict Marks | Predicts expected marks using Linear Regression (R²=0.937) |
| 💡 Prescriptive Plan | Identifies weakest factor and gives targeted improvement advice |
| 🔬 Scenario Simulator | What-if sliders to test study habit changes in real time |
| 🧠 Memory Curve | Ebbinghaus forgetting curve with spaced repetition planner |
| 🤖 AI Chatbot | Rule-based study assistant for instant guidance |
| 📜 History Dashboard | Track all past predictions and improvement over time |
| 🔐 Secure Auth | Token-based login using SHA-256 — no external library needed |

---

## 🧮 ML Model

**Algorithm:** Multiple Linear Regression  
**Accuracy:** R² = 0.937 (93.7%)

```
Marks = 4.624 + 5.007·H + 0.256·A + 1.842·S + 3.167·R
```

| Symbol | Parameter | Coefficient | Impact |
|--------|-----------|-------------|--------|
| H | Study Hours / Day | 5.007 | Highest |
| R | Revision Sessions / Week | 3.167 | Second |
| S | Sleep Hours / Night | 1.842 | Third |
| A | Attendance % | 0.256 | Fourth |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python stdlib only (`http.server`, `sqlite3`, `hashlib`, `math`) |
| Frontend | HTML5, CSS3, JavaScript |
| Charts | Chart.js |
| Database | SQLite3 (auto-created on first run) |
| ML | Pre-trained Linear Regression (hardcoded coefficients) |

> ✅ **No pip install required.** Runs on any machine with Python 3.x.

---

## ⚙️ How to Run

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/academic-dss.git

# 2. Go into the project folder
cd academic-dss

# 3. Start the server
python run.py

# 4. Open your browser and go to:
#    http://localhost:8080
```

That's it — no virtual environment, no pip install, no setup.

---

## 📁 Project Structure

```
academic-dss/
│
├── run.py                        # Main server — all routes + ML logic
├── start.command                 # One-click launcher (macOS)
├── README.md                     # Project documentation
├── DFD_Level1_Academic_DSS.html  # Data Flow Diagram (Level 1)
│
├── frontend/                     # All UI files
│   ├── index.html
│   ├── style.css
│   └── script.js
│
├── backend/                      # Supporting backend modules
│
└── data/                         # Dataset files
```

---

## 📐 System Architecture

```
Student
  │
  ├─ Login / Register (SHA-256 token auth)
  │
  ├─ Enter Parameters → ML Engine → Predicted Marks + Grade
  │
  ├─ Prescriptive Engine → Targeted study advice
  │
  ├─ Scenario Simulator → Real-time what-if prediction
  │
  ├─ Memory Curve → Ebbinghaus + Spaced Repetition calendar
  │
  ├─ AI Chatbot → Study tips and guidance
  │
  └─ History Dashboard → Past predictions + progress chart

          ↕ All data stored in SQLite3 (academic.db)
```

---

## 📡 API Routes (handled by run.py)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/register` | Create student account |
| POST | `/api/login` | Login and get session token |
| POST | `/api/predict` | Predict marks from H, A, S, R inputs |
| GET  | `/api/prescriptive` | Get improvement recommendations |
| GET  | `/api/scenario` | What-if scenario predictions |
| GET  | `/api/memory` | Forgetting curve data |
| GET  | `/api/history` | Student prediction history |
| POST | `/api/chat` | Chatbot query |

---

## 🎯 Future Scope

- LSTM model for time-series performance prediction
- Mobile app (Flutter / React Native)
- Faculty dashboard for batch-level analytics
- Transformer-based chatbot (DistilBERT / GPT)
- Adaptive quiz engine targeting weak areas
- Peer benchmarking with anonymised class analytics

---

## 📄 License

Developed as a Minor Project for academic purposes at CBIT (Autonomous), Hyderabad.  
Not for commercial use.
