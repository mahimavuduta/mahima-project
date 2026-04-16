import React, { useEffect, useState } from 'react'
import { getHistory } from '../services/api'

function gradeColor(marks) {
  if (marks >= 80) return '#15803d'
  if (marks >= 60) return '#4f46e5'
  if (marks >= 40) return '#d97706'
  return '#ef4444'
}
function grade(marks) {
  if (marks >= 90) return 'O'
  if (marks >= 80) return 'A+'
  if (marks >= 70) return 'A'
  if (marks >= 60) return 'B+'
  if (marks >= 50) return 'B'
  if (marks >= 40) return 'C'
  return 'F'
}

export default function HistoryPanel() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistory()
      .then(res => setRecords(res.data.history))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>⏳ Loading history…</div>

  const best = records.length ? Math.max(...records.map(r => r.predicted_marks)) : null
  const avg  = records.length ? (records.reduce((s, r) => s + r.predicted_marks, 0) / records.length).toFixed(1) : null

  return (
    <div style={styles.wrap}>
      <div style={styles.topRow}>
        <div>
          <h2 style={styles.title}>📂 My Prediction History</h2>
          <p style={styles.sub}>All {records.length} predictions saved to your profile</p>
        </div>
      </div>

      {records.length > 0 && (
        <div style={styles.summaryRow}>
          {[
            { label: 'Total Predictions', val: records.length, icon: '📊' },
            { label: 'Best Predicted Marks', val: best, icon: '🏆' },
            { label: 'Average Marks', val: avg, icon: '📈' },
            { label: 'Latest Grade', val: grade(records[0]?.predicted_marks), icon: '🎓' },
          ].map(({ label, val, icon }) => (
            <div className="card" style={styles.sumCard} key={label}>
              <div style={{ fontSize: 26, marginBottom: 6 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#4f46e5' }}>{val}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {records.length === 0 ? (
        <div className="card" style={styles.empty}>
          <div style={{ fontSize: 52 }}>📭</div>
          <div style={{ fontWeight: 700, fontSize: 16, marginTop: 12 }}>No predictions yet</div>
          <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 6 }}>
            Go to "Predict & Simulate" and run your first prediction — it'll show up here.
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.thead}>
                <th style={styles.th}>#</th>
                <th style={styles.th}>📚 Study (h)</th>
                <th style={styles.th}>🏫 Attend (%)</th>
                <th style={styles.th}>😴 Sleep (h)</th>
                <th style={styles.th}>🔁 Revision</th>
                <th style={styles.th}>🎯 Marks</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Date</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const gc = gradeColor(r.predicted_marks)
                const g  = grade(r.predicted_marks)
                return (
                  <tr key={r.id} style={{ ...styles.tr, background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                    <td style={styles.td}><span style={styles.rowNum}>{i + 1}</span></td>
                    <td style={styles.td}>{r.study_hours}</td>
                    <td style={styles.td}>{r.attendance}%</td>
                    <td style={styles.td}>{r.sleep_hours}</td>
                    <td style={styles.td}>{r.revision_freq}/wk</td>
                    <td style={styles.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={styles.markBar}>
                          <div style={{ ...styles.markBarFill, width: `${r.predicted_marks}%`, background: gc }} />
                        </div>
                        <strong style={{ color: gc }}>{r.predicted_marks}</strong>
                      </div>
                    </td>
                    <td style={styles.td}>
                      <span style={{ ...styles.gradePill, background: gc + '18', color: gc }}>{g}</span>
                    </td>
                    <td style={{ ...styles.td, fontSize: 12, color: '#9ca3af' }}>
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 22 },
  topRow: { },
  title: { fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280' },
  summaryRow: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  sumCard: { textAlign: 'center', padding: '20px 16px' },
  empty: { textAlign: 'center', padding: '60px 20px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: '#f8f9ff' },
  th: { padding: '13px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#6b7280', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' },
  tr: { transition: 'background .1s' },
  td: { padding: '12px 16px', fontSize: 14, borderBottom: '1px solid #f3f4f6' },
  rowNum: { width: 24, height: 24, background: '#f0f2ff', borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#6366f1' },
  markBar: { width: 60, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden', flexShrink: 0 },
  markBarFill: { height: '100%', borderRadius: 3, transition: 'width .4s' },
  gradePill: { padding: '2px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700 },
}
