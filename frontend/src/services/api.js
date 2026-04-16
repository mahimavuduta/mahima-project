/**
 * api.js — Centralized API service layer
 * All calls go through here; token is injected automatically.
 */

import axios from 'axios'

// Empty base URL — requests go through Vite's dev proxy to backend
const BASE_URL = ''

const api = axios.create({ baseURL: BASE_URL })

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Auth ─────────────────────────────────────────────────────────────────────
export const register = (data) => api.post('/auth/register', data)

export const login = (email, password) => {
  const form = new URLSearchParams()
  form.append('username', email)
  form.append('password', password)
  return api.post('/auth/login', form, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

export const getMe = () => api.get('/auth/me')

// ── Analytics ─────────────────────────────────────────────────────────────────
export const predict = (data) => api.post('/predict', data)
export const reverse = (data) => api.post('/reverse', data)
export const getScenarios = () => api.get('/scenario')
export const getMemory = (revisionFreq) => api.get(`/memory?revision_freq=${revisionFreq}`)
export const getHistory = () => api.get('/history')

// ── Chatbot ───────────────────────────────────────────────────────────────────
export const chat = (message, context = {}) =>
  api.post('/chat', { message, context })
