import { Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { HomeScreen } from './pages/HomeScreen'
import { AnalyzeScreen } from './pages/AnalyzeScreen'
import { ResultScreen } from './pages/ResultScreen'
import { HistoryScreen } from './pages/HistoryScreen'
import { AboutScreen } from './pages/AboutScreen'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomeScreen />} />
        <Route path="/analyze" element={<AnalyzeScreen />} />
        <Route path="/history" element={<HistoryScreen />} />
        <Route path="/about" element={<AboutScreen />} />
        <Route path="/result" element={<ResultScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
