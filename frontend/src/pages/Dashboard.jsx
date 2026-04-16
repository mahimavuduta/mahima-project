import React, { useState, useEffect, useCallback } from 'react'
import PredictPanel from '../components/PredictPanel'
import PrescriptivePanel from '../components/PrescriptivePanel'
import ScenarioChart from '../components/ScenarioChart'
import MemoryCurve from '../components/MemoryCurve'
import HistoryPanel from '../components/HistoryPanel'
import Chatbot from '../components/Chatbot'
import { predict, getHistory } from '../services/api'

const NAV_ITEMS = [
  { key: 'predict',      icon: '🎯', label: 'Predict & Simulate' },
  { key: 'prescriptive', icon: '📋', label: 'Prescriptive Plan' },
  { key: 'scenarios',    icon: '📊', label: 'Scenario Forecast' },
  { key: 'memory',       icon: '🧠', label: 'Memory Curve' },
  { key: 'history',      icon: '📂', label: 'My History' },
]

export default function Dashboard({ student, onLogout }) {
  const [activeTab, setActiveTab] = useState('predict')
  const [chatOpen, setChatOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Shared prediction state so chatbot can use current slider values
  const [currentInputs, setCurrentInputs] = useState({
    study_hours: 5, attendance: 75, sleep_hours: 7, revision_freq: 3,
  })

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <aside style={{ ...styles.sidebar, width: sidebarOpen ? 240 : 68, transition: 'width .2s' }}>
        <div style={styles.sidebarHeader}>
          <span style={styles.sidebarLogo}>🎓</span>
          {sidebarOpen && <span style={styles.sidebarTitle}>Academic DSS</span>}
        </div>

        <nav style={styles.nav}>
          {NAV_ITEMS.map(({ key, icon, label }) => (
            <button
              key={key}
              style={{
                ...styles.navItem,
                ...(activeTab === key ? styles.navItemActive : {}),
              }}
              onClick={() => setActiveTab(key)}
              title={!sidebarOpen ? label : ''}
            >
              <span style={styles.navIcon}>{icon}</span>
              {sidebarOpen && <span style={styles.navLabel}>{label}</span>}
            </button>
          ))}
        </nav>

        <button style={styles.collapseBtn} onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main content */}
      <div style={styles.main}>
        {/* Top bar */}
        <header style={styles.topbar}>
          <div>
            <h1 style={styles.pageTitle}>
              {NAV_ITEMS.find(n => n.key === activeTab)?.icon}{' '}
              {NAV_ITEMS.find(n => n.key === activeTab)?.label}
            </h1>
            <p style={styles.pageSub}>Academic Decision Support System</p>
          </div>
          <div style={styles.topbarRight}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setChatOpen(!chatOpen)}
              style={{ position: 'relative' }}
            >
              🤖 AI Assistant {chatOpen ? '▲' : '▼'}
              <span style={styles.chatDot} />
            </button>
            <div style={styles.avatar} title={student?.email}>
              {student?.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{student?.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>
                {student?.roll_number || student?.email}
              </div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={styles.content}>
          <div className="fade-in" key={activeTab}>
            {activeTab === 'predict'      && <PredictPanel onInputsChange={setCurrentInputs} />}
            {activeTab === 'prescriptive' && <PrescriptivePanel />}
            {activeTab === 'scenarios'    && <ScenarioChart />}
            {activeTab === 'memory'       && <MemoryCurve />}
            {activeTab === 'history'      && <HistoryPanel />}
          </div>
        </main>
      </div>

      {/* Chatbot overlay */}
      {chatOpen && (
        <Chatbot
          student={student}
          currentInputs={currentInputs}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  )
}

const styles = {
  shell: { display: 'flex', minHeight: '100vh', background: '#f0f2ff' },
  sidebar: {
    background: 'linear-gradient(180deg, #4f46e5 0%, #6366f1 100%)',
    display: 'flex', flexDirection: 'column',
    color: '#fff', flexShrink: 0, position: 'sticky', top: 0, height: '100vh',
    overflow: 'hidden',
  },
  sidebarHeader: { display: 'flex', alignItems: 'center', gap: 10, padding: '22px 16px', borderBottom: '1px solid rgba(255,255,255,.15)' },
  sidebarLogo:  { fontSize: 26, flexShrink: 0 },
  sidebarTitle: { fontSize: 15, fontWeight: 800, whiteSpace: 'nowrap' },
  nav: { flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '11px 12px', borderRadius: 10, border: 'none',
    background: 'transparent', color: 'rgba(255,255,255,.75)',
    cursor: 'pointer', fontSize: 14, fontWeight: 500,
    transition: 'all .15s', whiteSpace: 'nowrap', width: '100%', textAlign: 'left',
  },
  navItemActive: { background: 'rgba(255,255,255,.2)', color: '#fff', fontWeight: 700 },
  navIcon: { fontSize: 18, flexShrink: 0 },
  navLabel: {},
  collapseBtn: {
    margin: '12px 8px', padding: '8px', background: 'rgba(255,255,255,.15)',
    border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13,
  },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  topbar: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 28px', background: '#fff',
    borderBottom: '1px solid #e5e7eb', boxShadow: '0 2px 8px rgba(0,0,0,.04)',
  },
  pageTitle: { fontSize: 20, fontWeight: 800, marginBottom: 2 },
  pageSub: { fontSize: 12, color: '#9ca3af' },
  topbarRight: { display: 'flex', alignItems: 'center', gap: 14 },
  avatar: {
    width: 38, height: 38, borderRadius: '50%',
    background: 'linear-gradient(135deg, #6366f1, #7c3aed)',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: 800, fontSize: 16, flexShrink: 0,
  },
  chatDot: {
    position: 'absolute', top: -3, right: -3,
    width: 8, height: 8, borderRadius: '50%',
    background: '#22c55e', border: '2px solid #fff',
  },
  content: { flex: 1, padding: '28px', overflow: 'auto' },
}
