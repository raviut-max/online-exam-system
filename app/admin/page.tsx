'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const [admin, setAdmin] = useState<any>(null)
  const [stats, setStats] = useState({ students: 0, courses: 0, exams: 0 })
  const router = useRouter()

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (!storedAdmin) {
      router.push('/admin-login')
      return
    }
    setAdmin(JSON.parse(storedAdmin))
    loadStats()
  }, [router])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/admin/stats')
      const data = await res.json()
      if (res.ok) setStats(data)
    } catch (err) {
      console.error('Failed to load stats')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin')
    router.push('/admin-login')
  }

  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">กำลังโหลด...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🎓 ระบบจัดการสอบออนไลน์</h1>
            <p className="text-sm text-indigo-200">Admin Panel</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              สวัสดี, {admin.full_name}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-indigo-700 bg-white rounded-md hover:bg-indigo-50"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-4xl">👥</div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">นักศึกษาทั้งหมด</p>
                <p className="text-3xl font-bold text-gray-900">{stats.students}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-4xl">📚</div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">วิชาที่เปิดสอน</p>
                <p className="text-3xl font-bold text-gray-900">{stats.courses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="text-4xl">📝</div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">ชุดข้อสอบ</p>
                <p className="text-3xl font-bold text-gray-900">{stats.exams}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button
            onClick={() => router.push('/admin/students')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">👥</div>
            <h3 className="text-lg font-semibold text-gray-900">จัดการนักศึกษา</h3>
            <p className="text-sm text-gray-500 mt-1">เพิ่ม/ลบ/Import รายชื่อ</p>
          </button>

          <button
            onClick={() => router.push('/admin/courses')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📚</div>
            <h3 className="text-lg font-semibold text-gray-900">จัดการวิชา</h3>
            <p className="text-sm text-gray-500 mt-1">สร้างวิชาและลงทะเบียน</p>
          </button>

          <button
            onClick={() => router.push('/admin/exams')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📝</div>
            <h3 className="text-lg font-semibold text-gray-900">จัดการข้อสอบ</h3>
            <p className="text-sm text-gray-500 mt-1">สร้างชุดข้อสอบ</p>
          </button>

          <button
            onClick={() => router.push('/admin/results')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-gray-900">ดูผลคะแนน</h3>
            <p className="text-sm text-gray-500 mt-1">รายงานและ Export</p>
          </button>

          {/* ปุ่มใหม่: รายงานการลงทะเบียน */}
          <button
            onClick={() => router.push('/admin/report')}
            className="bg-white rounded-lg shadow p-6 text-left hover:shadow-lg transition-shadow"
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-gray-900">รายงานการลงทะเบียน</h3>
            <p className="text-sm text-gray-500 mt-1">ดูนักศึกษาแยกตามวิชา/Section</p>
          </button>
        </div>
      </main>
    </div>
  )
}