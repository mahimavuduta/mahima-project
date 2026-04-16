import React, { useState, useEffect, useCallback } from 'react'
import { predict } from '../services/api'

const DEFAULT = { study_hours: 5, attendance: 75, sleep_hours: 7, revision_freq: 3 }

const TOOLTIPS = {
  study_hours:   'Daily study hours directly impact marks. Aim for 5–8 hours for strong results.',
  attendance:    'Classes attended vs. total. 75% is the typical minimum requirement.',
  sleep_hours:   'Sleep consolidates memory. 7–9 hours is optimal for academic performance.',
  revision_freq: 'How many times per week you revise material. Combats the forgetting curve.',
}

export default function PredictPanel({ onInputsChange }) {
  const [inputs, setInputs] = useState(DEFAULT)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [autoPredict, setAutoPredict] = useState(true)

  const runPredict = useCallback(async (vals) => {
    setLoading(true)
    try {
      const res = await predict(vals)
      setResult(res.data)
    } catch (e) {
      console.error('Predict error', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoPredict) {
      const t = setTimeout(() => { runPredict(inputs); onInputsChange?.(inputs) }, 350)
      return () => clearTimeout(t)
    }
  }, [inputs, autoPredict])

  const handleSlider = (key, val) => {
    const next = { ...inputs, [key]: parseFloat(val) }
    setInputs(next)
  }

  const reset = () => { setInputs(DEFAULT); setResult(null) }

  const marks    = result?.predicted_marks ?? null
  const gradeStr = result?.grade ?? ''
  const gradeColor = gradeStr.startsWith('O') ? '#15803d'
                   : gradeStr.startsWith('A') ? '#4f46e5'
                   : gradeStr.startsWith('B') ? '#d97706'
                   : '#ef4444'

  return (
    <div style={styles.grid}>
      {/* ── Input Panel ───────────────────────────────────────────── */}
      <div className="card" style={styles.inputCard}>
        <div className="section-title"><span>🎛️</span> Simulation Controls</div>
        <p style={styles.hint}>Drag the sliders — your predicted marks update in real-time.</p>

        <div style={styles.sliders}>
          {[
            { key: 'study_hours',   label: '📚 Study Hours / Day',    min: 0, max: 10,  step: 0.5 },
            { key: 'attendance',    label: '🏫 Attendance %',          min: 0, max: 100, step: 1 },
            { key: 'sleep_hours',   label: '😴 Sleep Hours / Night',   min: 3, max: 10,  step: 0.5 },
            { key: 'revision_freq', label: '🔁 Revision Sessions / Week', min: 0, max: 7, step: 0.5 },
          ].map(({ key, label, min, max, step }) => (
            <div className="slider-wrap" key={key} title={TOOLTIPS[key]}>
              <div className="slider-label">
                <span>{label} <span className="tooltip-icon">ⓘ</span></span>
                <span className="slider-value">{inputs[key]}{key === 'attendance' ? '%' : ''}</span>
              </div>
              <input
                className="slider"
                type="range"
                min={min} max={max} step={step}
                value={inputs[key]}
                onChange={(e) => handleSlider(key, e.target.value)}
                style={{ accentColor: '#6366f1' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                <span>{min}</span><span>{max}{key === 'attendance' ? '%' : ''}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={styles.buttonRow}>
          <button className="btn btn-primary" onClick={() => runPredict(inputs)} disabled={loading}>
            {loading ? '⏳ Predicting…' : '🎯 Predict Now'}
          </button>
          <button className="btn btn-secondary" onClick={reset}>
            🔄 Reset Simulation
          </button>
        </div>
      </div>

      {/* ── Result Card ───────────────────────────────────────────── */}
      <div style={styles.rightCol}>
        <div className="card" style={styles.resultCard}>
          <div className="section-title"><span>📊</span> Prediction Result</div>

          {marks !== null ? (
            <div className="slide-up">
              {/* Big marks display */}
              <div style={styles.marksDisplay}>
                <svg viewBox="0 0 120 120" width="140" height="140">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e5e7eb" strokeWidth="10" />
                  <circle
                    cx="60" cy="60" r="52"
                    fill="none"
                    stroke={gradeColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 52}`}
                    strokeDashoffset={`${2 * Math.PI * 52 * (1 - marks / 100)}`}
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset .6s ease' }}
                  />
                  <text x="60" y="55" textAnchor="middle" fontSize="22" fontWeight="800" fill={gradeColor}>
                    {marks}
                  </text>
                  <text x="60" y="72" textAnchor="middle" fontSize="10" fill="#9ca3af">/ 100</text>
                </svg>
                <div>
                  <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 6 }}>Predicted Grade</div>
                  <div style={{ ...styles.gradeBadge, background: gradeColor + '20', color: gradeColor }}>
                    {gradeStr}
                  </div>
                </div>
              </div>

              {/* Contribution breakdown */}
              <div style={styles.breakdown}>
                <div style={styles.breakdownTitle}>Contribution Breakdown</div>
                {result?.breakdown && Object.entries(result.breakdown).map(([k, v]) => {
                  const labels = { study_contribution: '📚 Study', attendance_contribution: '🏫 Attendance', sleep_contribution: '😴 Sleep', revision_contribution: '🔁 Revision' }
                  const pct = Math.min(100, (v / 60) * 100)
                  return (
                    <div key={k} style={styles.barRow}>
                      <span style={styles.barLabel}>{labels[k]}</span>
                      <div style={styles.barTrack}>
                        <div style={{ ...styles.barFill, width: `${pct}%`, background: '#6366f1' }} />
                      </div>
                      <span style={styles.barVal}>{v}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎯</div>
              <div style={{ fontWeight: 600, color: '#6b7280' }}>Adjust the sliders to get your prediction</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>Results update in real-time as you drag</div>
            </div>
          )}
        </div>

        {/* Quick stats */}
        {marks !== null && (
          <div style={styles.statsRow} className="fade-in">
            {[
              { label: 'Study Hours', val: inputs.study_hours, unit: 'h/day', icon: '📚' },
              { label: 'Attendance',  val: inputs.attendance,  unit: '%',     icon: '🏫' },
              { label: 'Sleep',       val: inputs.sleep_hours, unit: 'h',     icon: '😴' },
              { label: 'Revisions',   val: inputs.revision_freq, unit: '/wk', icon: '🔁' },
            ].map(({ label, val, unit, icon }) => (
              <div className="card" style={styles.statCard} key={label}>
                <div style={{ fontSize: 22 }}>{icon}</div>
                <div className="stat-number" style={{ fontSize: 22, marginTop: 4 }}>{val}<span style={{ fontSize: 12, color: '#9ca3af' }}>{unit}</span></div>
                <div className="stat-label">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' },
  inputCard: { },
  rightCol:  { display: 'flex', flexDirection: 'column', gap: 18 },
  resultCard: { },
  hint: { fontSize: 13, color: '#6b7280', marginBottom: 20, marginTop: -8 },
  sliders: { display: 'flex', flexDirection: 'column', gap: 22 },
  buttonRow: { display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' },
  marksDisplay: { display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 },
  gradeBadge: { display: 'inline-block', padding: '5px 14px', borderRadius: 99, fontWeight: 700, fontSize: 13 },
  breakdown: { borderTop: '1px solid #f3f4f6', paddingTop: 16 },
  breakdownTitle: { fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 12 },
  barRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 },
  barLabel: { width: 120, fontSize: 12, fontWeight: 500, color: '#374151' },
  barTrack: { flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: '100%', borderRadius: 4, transition: 'width .5s ease' },
  barVal:   { width: 32, fontSize: 12, fontWeight: 600, color: '#6366f1', textAlign: 'right' },
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 },
  statCard: { padding: '14px 12px', textAlign: 'center' },
  emptyState: { textAlign: 'center', padding: '40px 20px' },
}
