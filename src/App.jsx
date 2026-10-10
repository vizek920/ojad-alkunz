import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import BigScreenPage from './pages/BigScreenPage'
import HomePage from './pages/HomePage'
import GameControlWrapper from './components/admin/GameControlWrapper'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* الصفحة الرئيسية — الضيوف والمضيفون */}
        <Route path="/" element={<HomePage />} />

        {/* لوحة تحكم المضيف — بعد إنشاء الجلسة */}
        <Route path="/session/:id" element={<GameControlWrapper />} />

        {/* شاشة العرض الكبيرة للمشاهدين */}
        <Route path="/screen/:sessionId" element={<BigScreenPage />} />

        {/* لوحة الإدارة — إضافة أسئلة وفئات */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin-kanz/login" element={<LoginPage />} />
        <Route path="/admin-kanz/*" element={<AdminPage />} />

        {/* أي مسار غير معروف → الصفحة الرئيسية */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
