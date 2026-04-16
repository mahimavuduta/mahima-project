import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'
import { getScenarios } from '../services/api'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const COLORS = {
  'High Effort':   { bar: '#6366f1', light: '#e0e7ff' },
  'Medium Effort': { bar: '#f59e0b', light: '#fef9c3' },
  'Low Effort':    { bar: '#ef4444', light: '#fee2e2' },
}

export default function ScenarioChart() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getScenarios()
      .then(res => setData(res.data.scenarios))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loading}>⏳ Loading scenarios…</div>
  if (!data)   return <div style={styles.loading}>❌ Failed to load scenarios</div>

  const chartData = {
    labels: data.map(s => s.scenario),
    datasets: [
      {
        label: 'Predicted Marks',
        data: data.map(s => s.predicted_marks),
        backgroundColor: data.map(s => COLORS[s.scenario]?.bar + 'cc' || '#6366f1cc'),
        borderColor:     data.map(s => COLORS[s.scenario]?.bar || '#6366f1'),
        borderWidth: 2,
        borderRadius: 10,
        borderSkipped: false,
      },
    ],
  }

  const options = {
    responsive: true,
    animation: { duration: 1000, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Predicted: ${ctx.raw} / 100`,
          afterLabel: (ctx) => {
            const s = data[ctx.dataIndex]
            return [
              `Grade: ${s.grade}`,
              `Study: ${s.inputs.study_hours}h  Attendance: ${s.inputs.attendance}%`,
              `Sleep: ${s.inputs.sleep_hours}h  Revision: ${s.inputs.revision_freq}/wk`,
            ]
          },
        },
      },
    },
    scales: {
      y: {
        min: 0, max: 100,
        grid: { color: '#f3f4f6' },
        ticks: { font: { size: 12 }, callback: (v) => `${v}%` },
        title: { display: true, text: 'Predicted Marks', font: { size: 12, weight: '600' }, color: '#6b7280' },
      },
      x: { grid: { display: false }, ticks: { font: { size: 13, weight: '600' } } },
    },
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📊 Scenario-Based Forecasting</h2>
          <p style={styles.sub}>Compare predicted outcomes across three effort levels</p>
        </div>
      </div>

      {/* Scenario cards */}
      <div style={styles.cardsRow}>
        {data.map(s => {
          const col = COLORS[s.scenario] || { bar: '#6366f1', light: '#e0e7ff' }
          return (
            <div key={s.scenario} className="card" style={styles.sCard}>
              <div style={{ ...styles.sCardAccent, background: col.bar }} />
              <div style={styles.sIcon}>
                {s.scenario === 'High Effort' ? '🚀' : s.scenario === 'Medium Effort' ? '📖' : '😴'}
              </div>
              <div style={styles.sLabel}>{s.scenario}</div>
              <div style={{ ...styles.sMarks, color: col.bar }}>{s.predicted_marks}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>/ 100</div>
              <div style={{ ...styles.sGrade, background: col.light, color: col.bar }}>{s.grade}</div>

              <div style={styles.sDetails}>
                <div>📚 {s.inputs.study_hours}h study</div>
                <div>🏫 {s.inputs.attendance}% attend</div>
                <div>😴 {s.inputs.sleep_hours}h sleep</div>
                <div>🔁 {s.inputs.revision_freq}×/wk</div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Bar chart */}
      <div className="card" style={styles.chartCard}>
        <Bar data={chartData} options={options} height={80} />
      </div>

      <div className="card" style={styles.insight}>
        <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 15 }}>💡 Key Insight</div>
        <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6 }}>
          The difference between <strong>High</strong> and <strong>Low Effort</strong> scenarios is
          <strong style={{ color: '#6366f1' }}>
            {' '}{(data[0].predicted_marks - data[2].predicted_marks).toFixed(1)} marks
          </strong>.
          Small consistent improvements in study hours and revision frequency compound into a significant grade jump.
          Even moving from Low to Medium Effort gains you{' '}
          <strong style={{ color: '#f59e0b' }}>
            {(data[1].predicted_marks - data[2].predicted_marks).toFixed(1)} extra marks
          </strong>.
        </p>
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  title: { fontSize: 22, fontWeight: 800, marginBottom: 4 },
  sub: { fontSize: 13, color: '#6b7280' },
  loading: { textAlign: 'center', padding: 60, color: '#9ca3af', fontSize: 16 },
  cardsRow: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 },
  sCard: { position: 'relative', overflow: 'hidden', textAlign: 'center', paddingTop: 28 },
  sCardAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  sIcon: { fontSize: 36, marginBottom: 8 },
  sLabel: { fontWeight: 700, fontSize: 15, marginBottom: 10 },
  sMarks: { fontSize: 52, fontWeight: 900, lineHeight: 1 },
  sGrade: { display: 'inline-block', padding: '4px 12px', borderRadius: 99, fontSize: 12, fontWeight: 600, marginBottom: 14 },
  sDetails: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12, color: '#6b7280', textAlign: 'left' },
  chartCard: { },
  insight: { background: 'linear-gradient(135deg, #f0f2ff, #e0e7ff)', border: '1px solid #c7d2fe' },
}
