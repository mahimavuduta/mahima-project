import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [student, setStudent] = useState(
    JSON.parse(localStorage.getItem('student') || 'null')
  )

  const handleLogin = (tok, studentData) => {
    localStorage.setItem('token', tok)
    localStorage.setItem('student', JSON.stringify(studentData))
    setToken(tok)
    setStudent(studentData)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('student')
    setToken(null)
    setStudent(null)
  }

  return (
    <Routes>
      <Route
        path="/auth"
        element={
          token ? (
            <Navigate to="/" replace />
          ) : (
            <AuthPage onLogin={handleLogin} />
          )
        }
      />
      <Route
        path="/*"
        element={
          token ? (
            <Dashboard student={student} onLogout={handleLogout} />
          ) : (
            <Navigate to="/auth" replace />
          )
        }
      />
    </Routes>
  )
}
