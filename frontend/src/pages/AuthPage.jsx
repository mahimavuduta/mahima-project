import React, { useState } from 'react'
import { login, register } from '../services/api'

export default function AuthPage({ onLogin }) {
  const [mode, setMode] = useState('login')   // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', roll_number: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'register') {
        await register({ name: form.name, email: form.email, password: form.password, roll_number: form.roll_number })
        setMode('login')
        setError('✅ Registered! Please log in.')
      } else {
        const res = await login(form.email, form.password)
        onLogin(res.data.access_token, res.data.student)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Left panel */}
      <div style={styles.hero}>
        <div style={styles.heroContent}>
          <div style={styles.logoWrap}>
            <span style={styles.logoIcon}>🎓</span>
          </div>
          <h1 style={styles.heroTitle}>Academic DSS</h1>
          <p style={styles.heroSub}>Decision Support System</p>
          <div style={styles.features}>
            {[
              ['📊', 'Predictive Analytics', 'Forecast your marks instantly'],
              ['🔁', 'Prescriptive Analytics', 'Get a personalised study plan'],
              ['📈', 'Scenario Forecasting', 'Compare effort levels'],
              ['🧠', 'Memory Curve', 'Visualise the forgetting curve'],
              ['🤖', 'AI Chatbot', 'Ask about attendance & study tips'],
            ].map(([icon, title, desc]) => (
              <div style={styles.featureItem} key={title}>
                <span style={styles.featureIcon}>{icon}</span>
                <div>
                  <div style={styles.featureTitle}>{title}</div>
                  <div style={styles.featureDesc}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div style={styles.formPanel}>
        <div style={styles.card} className="fade-in">
          <div style={styles.tabs}>
            <button
              style={{ ...styles.tab, ...(mode === 'login' ? styles.tabActive : {}) }}
              onClick={() => { setMode('login'); setError('') }}
            >Login</button>
            <button
              style={{ ...styles.tab, ...(mode === 'register' ? styles.tabActive : {}) }}
              onClick={() => { setMode('register'); setError('') }}
            >Register</button>
          </div>

          <h2 style={styles.cardTitle}>
            {mode === 'login' ? 'Welcome back 👋' : 'Create account 🎓'}
          </h2>
          <p style={styles.cardSub}>
            {mode === 'login'
              ? 'Log in to access your personal academic dashboard'
              : 'Join and start tracking your academic performance'}
          </p>

          {error && (
            <div style={{ ...styles.alert, background: error.startsWith('✅') ? '#dcfce7' : '#fee2e2', color: error.startsWith('✅') ? '#166534' : '#991b1b' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={styles.form}>
            {mode === 'register' && (
              <>
                <div className="input-group">
                  <label>Full Name</label>
                  <input className="input-field" name="name" placeholder="e.g. Rahul Sharma" value={form.name} onChange={update} required />
                </div>
                <div className="input-group">
                  <label>Roll Number (optional)</label>
                  <input className="input-field" name="roll_number" placeholder="e.g. CS2024001" value={form.roll_number} onChange={update} />
                </div>
              </>
            )}
            <div className="input-group">
              <label>Email</label>
              <input className="input-field" name="email" type="email" placeholder="you@college.edu" value={form.email} onChange={update} required />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input className="input-field" name="password" type="password" placeholder="Min. 6 characters" value={form.password} onChange={update} required minLength={6} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '13px' }}>
              {loading ? '⏳ Please wait…' : mode === 'login' ? '🚀 Login' : '✅ Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif' },
  hero: {
    flex: 1,
    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    minWidth: 0,
  },
  heroContent: { maxWidth: 400, color: '#fff' },
  logoWrap: { width: 64, height: 64, background: 'rgba(255,255,255,.2)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  logoIcon: { fontSize: 32 },
  heroTitle: { fontSize: 38, fontWeight: 800, marginBottom: 6 },
  heroSub: { fontSize: 16, opacity: .8, marginBottom: 36 },
  features: { display: 'flex', flexDirection: 'column', gap: 16 },
  featureItem: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  featureIcon: { fontSize: 22, marginTop: 2, minWidth: 28 },
  featureTitle: { fontWeight: 700, fontSize: 15, marginBottom: 2 },
  featureDesc: { fontSize: 13, opacity: .75 },
  formPanel: { width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 32px', background: '#f0f2ff' },
  card: { width: '100%', background: '#fff', borderRadius: 16, padding: 36, boxShadow: '0 8px 40px rgba(99,102,241,.18)' },
  tabs: { display: 'flex', gap: 0, marginBottom: 24, background: '#f0f2ff', borderRadius: 10, padding: 4 },
  tab: { flex: 1, padding: '9px 0', border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, color: '#6b7280', transition: 'all .15s' },
  tabActive: { background: '#fff', color: '#4f46e5', boxShadow: '0 2px 8px rgba(99,102,241,.15)' },
  cardTitle: { fontSize: 24, fontWeight: 800, marginBottom: 6 },
  cardSub: { fontSize: 14, color: '#6b7280', marginBottom: 20 },
  alert: { padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginBottom: 16 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
}
