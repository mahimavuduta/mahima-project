import React, { useState } from 'react'
import { reverse } from '../services/api'

export default function PrescriptivePanel() {
  const [target, setTarget]   = useState(75)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await reverse({ target_marks: parseFloat(target) })
      setResult(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Error calculating. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const achieved = result?.achievable_marks
  const gradeColor = achieved >= 80 ? '#15803d' : achieved >= 60 ? '#4f46e5' : achieved >= 40 ? '#d97706' : '#ef4444'

  return (
    <div style={styles.grid}>
      {/* Left: input */}
      <div className="card">
        <div className="section-title"><span>🎯</span> Prescriptive Analytics</div>
        <p style={styles.hint}>
          Enter your target marks and we'll calculate the exact study inputs needed to achieve them.
        </p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.targetWrap}>
            <label style={styles.targetLabel}>Target Marks</label>
            <div style={styles.targetRow}>
              <input
                className="slider"
                type="range"
                min={40} max={100} step={1}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                style={{ flex: 1, accentColor: '#6366f1' }}
              />
              <div style={styles.targetBadge}>{target}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
              <span>40</span><span>100</span>
            </div>
          </div>

          <div style={styles.presets}>
            <span style={styles.presetsLabel}>Quick targets:</span>
            {[60, 70, 80, 90, 95].map(v => (
              <button key={v} type="button" className="btn btn-secondary btn-sm"
                onClick={() => setTarget(v)}
                style={target == v ? { background: '#e0e7ff', color: '#4f46e5', borderColor: '#6366f1' } : {}}
              >{v}%</button>
            ))}
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? '⏳ Calculating…' : '🔍 Find Required Inputs'}
          </button>
        </form>
      </div>

      {/* Right: result */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {result ? (
          <>
            <div className="card slide-up">
              <div className="section-title"><span>✅</span> Your Study Plan</div>
              <div style={styles.achievable}>
                <span style={{ color: '#6b7280', fontSize: 14 }}>Achievable marks with this plan:</span>
                <span style={{ ...styles.achievedBadge, background: gradeColor + '18', color: gradeColor }}>
                  {achieved} / 100
                </span>
              </div>

              <div style={styles.requirementsGrid}>
                {[
                  { label: 'Study Hours / Day',      val: result.required_study_hours,  unit: 'h',   icon: '📚', max: 10 },
                  { label: 'Attendance',              val: result.required_attendance,   unit: '%',   icon: '🏫', max: 100 },
                  { label: 'Revision Sessions / Week',val: result.required_revision_freq, unit: '/wk', icon: '🔁', max: 7 },
                  { label: 'Sleep (Recommended)',     val: result.sleep_hours_recommended, unit: 'h', icon: '😴', max: 10 },
                ].map(({ label, val, unit, icon, max }) => (
                  <div key={label} style={styles.reqCard}>
                    <div style={styles.reqIcon}>{icon}</div>
                    <div style={styles.reqVal}>{val}<span style={{ fontSize: 13, color: '#9ca3af' }}>{unit}</span></div>
                    <div style={styles.reqLabel}>{label}</div>
                    <div style={styles.reqBar}>
                      <div style={{ ...styles.reqBarFill, width: `${(val / max) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {result.tips?.length > 0 && (
              <div className="card slide-up">
                <div className="section-title"><span>💡</span> Personalised Tips</div>
                <div style={styles.tips}>
                  {result.tips.map((tip, i) => (
                    <div key={i} style={styles.tipItem}>{tip}</div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card" style={styles.empty}>
            <div style={{ fontSize: 52 }}>🗺️</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>Your personalised plan will appear here</div>
            <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>Set a target and click "Find Required Inputs"</div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 24, marginTop: -8 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  targetWrap: { display: 'flex', flexDirection: 'column', gap: 8 },
  targetLabel: { fontSize: 13, fontWeight: 700, color: '#374151' },
  targetRow: { display: 'flex', alignItems: 'center', gap: 14 },
  targetBadge: { minWidth: 52, height: 40, background: 'linear-gradient(135deg,#6366f1,#7c3aed)', color: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 18 },
  presets: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  presetsLabel: { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  error: { background: '#fee2e2', color: '#991b1b', padding: '10px 14px', borderRadius: 8, fontSize: 13 },
  achievable: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: '#f8f9ff', borderRadius: 10 },
  achievedBadge: { padding: '5px 16px', borderRadius: 99, fontWeight: 800, fontSize: 18 },
  requirementsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  reqCard: { background: '#f8f9ff', borderRadius: 12, padding: '16px', border: '1px solid #e5e7eb' },
  reqIcon: { fontSize: 22, marginBottom: 6 },
  reqVal: { fontSize: 26, fontWeight: 800, color: '#4f46e5', lineHeight: 1.1 },
  reqLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, marginBottom: 8 },
  reqBar: { height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  reqBarFill: { height: '100%', background: 'linear-gradient(90deg,#6366f1,#7c3aed)', borderRadius: 3, transition: 'width .6s ease' },
  tips: { display: 'flex', flexDirection: 'column', gap: 10 },
  tipItem: { padding: '10px 14px', background: '#f0f2ff', borderRadius: 8, fontSize: 14, color: '#374151', borderLeft: '3px solid #6366f1' },
  empty: { textAlign: 'center', padding: '60px 20px' },
}
