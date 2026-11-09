'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminReportPage() {
  const [report, setReport] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCourse, setFilterCourse] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (!storedAdmin) {
      router.push('/admin-login')
      return
    }
    loadCourses()
    loadReport()
  }, [router])

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses')
      const data = await res.json()
      if (res.ok) setCourses(data.courses)
    } catch (err) {
      console.error('Failed to load courses')
    }
  }

  const loadReport = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCourse) params.set('course_code', filterCourse)
      if (filterSection) params.set('section', filterSection)

      const res = await fetch(`/api/admin/report/enrollment?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setReport(data.report)
    } catch (err) {
      console.error('Failed to load report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReport()
  }, [filterCourse, filterSection])

  const totalStudents = report.reduce((sum: number, r: any) => sum + r.student_count, 0)
  const totalCourses = report.length

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">📊 รายงานการลงทะเบียน</h1>
          <p className="text-sm text-indigo-200">ดูรายชื่อนักศึกษาแยกตามวิชาและกลุ่มเรียน</p>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-indigo-200 hover:text-white mt-1"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">🔽 ตัวกรอง</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">วิชา</label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">-- ทุกวิชา --</option>
                {courses.map((c: any) => (
                  <option key={c.id} value={c.course_code}>
                    {c.course_code} - {c.course_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">กลุ่มเรียน</label>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option value="">-- ทุกกลุ่ม --</option>
                <option value="001">กลุ่ม 001</option>
                <option value="002">กลุ่ม 002</option>
                <option value="003">กลุ่ม 003</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">จำนวนวิชา</div>
            <div className="text-3xl font-bold text-indigo-600">{totalCourses}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-500">จำนวนนักศึกษา (รวมทุกกลุ่ม)</div>
            <div className="text-3xl font-bold text-green-600">{totalStudents}</div>
          </div>
        </div>

        {/* Report */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">⏳ กำลังโหลด...</div>
        ) : report.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">ไม่พบข้อมูล</div>
        ) : (
          <div className="space-y-6">
            {report.map((item: any, idx: number) => (
              <div key={idx} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Course Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-bold">
                        {item.course.course_code} - {item.course.course_name}
                      </h2>
                      <p className="text-sm text-indigo-200">
                        กลุ่มเรียน: {item.course.section} | ภาค: {item.course.semester} | อาจารย์: {item.course.teacher_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold">{item.student_count}</div>
                      <div className="text-xs text-indigo-200">คน</div>
                    </div>
                  </div>
                </div>

                {/* Student List */}
                {item.students.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">ยังไม่มีนักศึกษาลงทะเบียน</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">#</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">รหัส</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ชื่อ-นามสกุล</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">สาขา</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">ปี</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">สถานะอีเมล</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {item.students.map((s: any, sIdx: number) => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-500">{sIdx + 1}</td>
                            <td className="px-4 py-2 text-sm font-mono font-medium">{s.student_code}</td>
                            <td className="px-4 py-2 text-sm">{s.full_name}</td>
                            <td className="px-4 py-2 text-sm">{s.department || '-'}</td>
                            <td className="px-4 py-2 text-sm">{s.year || '-'}</td>
                            <td className="px-4 py-2 text-sm">
                              {s.email_verified ? (
                                <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">✓ ยืนยันแล้ว</span>
                              ) : s.email ? (
                                <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">⏳ รอยืนยัน</span>
                              ) : (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">- ยังไม่มีอีเมล</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}