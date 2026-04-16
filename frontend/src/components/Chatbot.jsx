import React, { useState, useRef, useEffect } from 'react'
import { chat } from '../services/api'

const QUICK_QUESTIONS = [
  '👋 Hello! What can you help with?',
  '🏫 How many classes do I need to attend?',
  '📚 How many hours should I study?',
  '🔁 How often should I revise?',
  '😴 How does sleep affect my grades?',
  '💪 I am failing. What should I do?',
  '📅 Give me exam tips',
]

function MarkdownText({ text }) {
  // Simple inline markdown renderer: **bold**, \n → <br/>
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={i}>{p.slice(2, -2)}</strong>
          : p.split('\n').map((line, j, arr) => (
              <React.Fragment key={`${i}-${j}`}>
                {line}
                {j < arr.length - 1 && <br />}
              </React.Fragment>
            ))
      )}
    </span>
  )
}

export default function Chatbot({ student, currentInputs, onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: `Hi ${student?.name?.split(' ')[0] || 'there'}! 👋 I'm your Academic Assistant.\n\nI can help you with attendance calculations, study planning, revision strategies, and exam tips.\n\nWhat would you like to know?`,
    },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [totalClasses, setTotalClasses]   = useState('')
  const [attendedClasses, setAttendedClasses] = useState('')
  const [showContext, setShowContext] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    const context = {
      ...currentInputs,
      total_classes:    totalClasses    ? parseInt(totalClasses)    : undefined,
      attended_classes: attendedClasses ? parseInt(attendedClasses) : undefined,
    }

    try {
      const res = await chat(userMsg, context)
      setMessages(prev => [...prev, { role: 'bot', text: res.data.reply }])
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "Sorry, I'm having trouble connecting to the server. Please make sure the backend is running! 🔌",
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) }
  }

  return (
    <div style={styles.overlay}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.avatarBot}>🤖</div>
          <div>
            <div style={styles.botName}>Academic Assistant</div>
            <div style={styles.botStatus}><span style={styles.onlineDot} /> Online</div>
          </div>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.iconBtn} title="Toggle context panel" onClick={() => setShowContext(!showContext)}>⚙️</button>
          <button style={styles.iconBtn} onClick={onClose} title="Close chat">✕</button>
        </div>
      </div>

      {/* Context panel */}
      {showContext && (
        <div style={styles.contextPanel}>
          <div style={styles.contextTitle}>📋 Attendance Context (Optional)</div>
          <div style={styles.contextRow}>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Total Classes</label>
              <input className="input-field" type="number" placeholder="e.g. 60" value={totalClasses} onChange={e => setTotalClasses(e.target.value)} style={{ padding: '7px 10px' }} />
            </div>
            <div className="input-group" style={{ flex: 1 }}>
              <label>Classes Attended</label>
              <input className="input-field" type="number" placeholder="e.g. 42" value={attendedClasses} onChange={e => setAttendedClasses(e.target.value)} style={{ padding: '7px 10px' }} />
            </div>
          </div>
          {totalClasses && attendedClasses && (
            <div style={styles.attDisplay}>
              Current: <strong style={{ color: parseFloat(attendedClasses)/parseFloat(totalClasses)*100 >= 75 ? '#15803d' : '#ef4444' }}>
                {((parseFloat(attendedClasses) / parseFloat(totalClasses)) * 100).toFixed(1)}%
              </strong>
              {parseFloat(attendedClasses)/parseFloat(totalClasses)*100 >= 75
                ? ' ✅ Above minimum'
                : ' ⚠️ Below 75% minimum'}
            </div>
          )}
          <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>
            Fill these to get precise attendance calculations when you ask questions.
          </p>
        </div>
      )}

      {/* Messages */}
      <div style={styles.messages}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.msgWrap, justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'bot' && <div style={styles.botAvatar}>🤖</div>}
            <div style={{
              ...styles.bubble,
              ...(m.role === 'user' ? styles.userBubble : styles.botBubble),
            }}>
              <MarkdownText text={m.text} />
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ ...styles.msgWrap, justifyContent: 'flex-start' }}>
            <div style={styles.botAvatar}>🤖</div>
            <div style={{ ...styles.bubble, ...styles.botBubble }}>
              <div style={styles.typing}>
                <span /><span /><span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      <div style={styles.quickWrap}>
        <div style={styles.quickScroll}>
          {QUICK_QUESTIONS.map((q, i) => (
            <button key={i} style={styles.quickBtn} onClick={() => sendMessage(q)}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div style={styles.inputBar}>
        <textarea
          style={styles.textarea}
          rows={1}
          placeholder="Ask about attendance, study tips, revision…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          style={{ ...styles.sendBtn, opacity: input.trim() && !loading ? 1 : 0.4 }}
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
        >
          ➤
        </button>
      </div>
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed', bottom: 24, right: 24,
    width: 400, height: 600,
    background: '#fff',
    borderRadius: 20,
    boxShadow: '0 16px 60px rgba(0,0,0,.18)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
    zIndex: 1000,
    animation: 'slideUp .3s ease',
    border: '1px solid #e5e7eb',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
    color: '#fff',
    flexShrink: 0,
  },
  headerLeft:  { display: 'flex', alignItems: 'center', gap: 10 },
  avatarBot:   { width: 38, height: 38, background: 'rgba(255,255,255,.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 },
  botName:     { fontWeight: 700, fontSize: 14 },
  botStatus:   { fontSize: 11, opacity: .8, display: 'flex', alignItems: 'center', gap: 4 },
  onlineDot:   { display: 'inline-block', width: 7, height: 7, background: '#4ade80', borderRadius: '50%' },
  headerActions: { display: 'flex', gap: 6 },
  iconBtn: { background: 'rgba(255,255,255,.2)', border: 'none', color: '#fff', width: 30, height: 30, borderRadius: 8, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  contextPanel: { padding: '12px 16px', background: '#f8f9ff', borderBottom: '1px solid #e5e7eb', flexShrink: 0 },
  contextTitle: { fontSize: 12, fontWeight: 700, color: '#4f46e5', marginBottom: 8 },
  contextRow: { display: 'flex', gap: 10 },
  attDisplay: { marginTop: 6, fontSize: 13, color: '#374151' },
  messages: { flex: 1, overflow: 'auto', padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 12 },
  msgWrap: { display: 'flex', alignItems: 'flex-end', gap: 8 },
  botAvatar: { width: 28, height: 28, background: '#e0e7ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 },
  bubble: { maxWidth: '80%', padding: '10px 13px', borderRadius: 14, fontSize: 13.5, lineHeight: 1.55, wordBreak: 'break-word' },
  userBubble: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)', color: '#fff', borderBottomRightRadius: 4 },
  botBubble: { background: '#f3f4f6', color: '#111827', borderBottomLeftRadius: 4 },
  typing: { display: 'flex', gap: 5, padding: '2px 4px' },
  quickWrap: { borderTop: '1px solid #f3f4f6', padding: '8px 12px 6px', flexShrink: 0 },
  quickScroll: { display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 4 },
  quickBtn: { flexShrink: 0, padding: '5px 10px', background: '#f0f2ff', border: '1px solid #e0e7ff', borderRadius: 99, fontSize: 12, color: '#4f46e5', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' },
  inputBar: { display: 'flex', gap: 10, padding: '10px 14px', borderTop: '1px solid #f3f4f6', alignItems: 'flex-end', flexShrink: 0 },
  textarea: { flex: 1, padding: '10px 13px', border: '1.5px solid #e5e7eb', borderRadius: 10, fontSize: 13.5, resize: 'none', fontFamily: 'inherit', maxHeight: 100, outline: 'none', transition: 'border-color .15s' },
  sendBtn: { width: 40, height: 40, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity .15s' },
}
