import React, { useEffect, useState } from 'react'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { getMemory } from '../services/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

export default function MemoryCurve() {
  const [revFreq, setRevFreq]   = useState(3)
  const [memData, setMemData]   = useState(null)
  const [loading, setLoading]   = useState(false)

  const fetchMemory = async (freq) => {
    setLoading(true)
    try {
      const res = await getMemory(freq)
      setMemData(res.data)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    const t = setTimeout(() => fetchMemory(revFreq), 400)
    return () => clearTimeout(t)
  }, [revFreq])

  const chartData = memData ? {
    labels: memData.data.map(d => `Day ${d.day}`),
    datasets: [
      {
        label: 'Memory Retention %',
        data: memData.data.map(d => d.retention),
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.12)',
        fill: true,
        tension: 0.4,
        pointRadius: (ctx) => {
          const day = ctx.dataIndex
          return memData.revision_days?.includes(day) ? 7 : 3
        },
        pointBackgroundColor: (ctx) => {
          const day = ctx.dataIndex
          return memData.revision_days?.includes(day) ? '#22c55e' : '#6366f1'
        },
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
    ],
  } : null

  const options = {
    responsive: true,
    animation: { duration: 800, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` Retention: ${ctx.raw}%`,
          afterLabel: (ctx) => {
            const day = ctx.dataIndex
            return memData?.revision_days?.includes(day)
              ? '📗 Revision session today! Retention boosted.'
              : ''
          },
        },
      },
    },
    scales: {
      y: {
        min: 0, max: 105,
        grid: { color: '#f3f4f6' },
        ticks: { callback: (v) => `${v}%`, font: { size: 12 } },
        title: { display: true, text: 'Memory Retention %', font: { size: 12, weight: '600' }, color: '#6b7280' },
      },
      x: {
        grid: { display: false },
        ticks: {
          maxTicksLimit: 10,
          font: { size: 11 },
          callback: (val, i) => (i % 5 === 0 ? `Day ${i}` : ''),
        },
      },
    },
  }

  const finalRetention = memData?.data?.at(-1)?.retention?.toFixed(1) ?? '--'

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>🧠 Memory Retention Curve</h2>
          <p style={styles.sub}>
            Based on the <strong>Ebbinghaus Forgetting Curve</strong> — see how memory decays without revision
            and recovers with revision sessions.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card" style={styles.controls}>
        <div style={styles.controlRow}>
          <div className="slider-wrap" style={{ flex: 1 }}>
            <div className="slider-label">
              <span>🔁 Revision Sessions per Week</span>
              <span className="slider-value">{revFreq}/week</span>
            </div>
            <input
              className="slider"
              type="range" min={0} max={7} step={0.5}
              value={revFreq}
              onChange={(e) => setRevFreq(parseFloat(e.target.value))}
              style={{ accentColor: '#6366f1' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
              <span>0 (No revision)</span><span>7 (Daily)</span>
            </div>
          </div>

          <div style={styles.statCards}>
            <div style={styles.statBox}>
              <div style={{ fontSize: 22 }}>📅</div>
              <div style={styles.statBig}>{memData?.revision_days?.length ?? '--'}</div>
              <div style={styles.statLbl}>Revision Days</div>
            </div>
            <div style={styles.statBox}>
              <div style={{ fontSize: 22 }}>🎯</div>
              <div style={styles.statBig}>{finalRetention}%</div>
              <div style={styles.statLbl}>Day 30 Retention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>⏳ Generating curve…</div>
        ) : chartData ? (
          <>
            <div style={{ display: 'flex', gap: 18, marginBottom: 16, fontSize: 13, flexWrap: 'wrap' }}>
              <div style={styles.legend}><span style={{ ...styles.dot, background: '#6366f1' }} /> Memory Retention</div>
              <div style={styles.legend}><span style={{ ...styles.dot, background: '#22c55e' }} /> Revision Session (green dot)</div>
            </div>
            <Line data={chartData} options={options} height={70} />
          </>
        ) : null}
      </div>

      {/* Info cards */}
      <div style={styles.infoGrid}>
        {[
          { icon: '📉', title: 'Forgetting Rate', desc: 'Without revision, ~8% of memory is lost each day. Within a week, you may forget over 40% of new material.' },
          { icon: '🔁', title: 'Spaced Repetition', desc: 'Revising at increasing intervals (1, 2, 4, 7 days) moves memories to long-term storage efficiently.' },
          { icon: '⏰', title: 'Best Time to Revise', desc: 'Revise within 24 hours of learning. The green dots on the chart show when revisions dramatically boost retention.' },
          { icon: '📈', title: 'Impact on Marks', desc: 'Higher retention means better exam performance. Our model shows revision frequency contributes ~3 marks per session/week.' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="card" style={styles.infoCard}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
            <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 14 }}>{title}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 24 },
  header: { },
  title: { fontSize: 22, fontWeight: 800, marginBottom: 6 },
  sub: { fontSize: 14, color: '#6b7280', lineHeight: 1.6 },
  controls: { },
  controlRow: { display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' },
  statCards: { display: 'flex', gap: 14, flexShrink: 0 },
  statBox: { textAlign: 'center', background: '#f8f9ff', borderRadius: 12, padding: '14px 20px', minWidth: 100, border: '1px solid #e5e7eb' },
  statBig: { fontSize: 24, fontWeight: 800, color: '#4f46e5', marginTop: 4 },
  statLbl: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  legend: { display: 'flex', alignItems: 'center', gap: 7, color: '#6b7280' },
  dot: { width: 10, height: 10, borderRadius: '50%', display: 'inline-block' },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 },
  infoCard: { },
}
