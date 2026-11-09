'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [courses, setCourses] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [newStudent, setNewStudent] = useState({
    student_code: '',
    full_name: '',
    department: 'วิศวกรรมคอมพิวเตอร์',
    year: 2,
  })
  const [totalStudents, setTotalStudents] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (!storedAdmin) {
      router.push('/admin-login')
      return
    }
    loadCourses()
    loadStudents()
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

  const loadStudents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterSection) params.set('section', filterSection)
      if (filterYear) params.set('year', filterYear)
      if (filterCourse) params.set('course_code', filterCourse)

      const res = await fetch(`/api/admin/students?${params.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setStudents(data.students)
        setTotalStudents(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to load students')
    } finally {
      setLoading(false)
    }
  }

  // Debounce การค้นหาและกรอง
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadStudents()
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [search, filterSection, filterYear, filterCourse])

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStudent),
      })
      const data = await res.json()
      if (res.ok) {
        setShowAddModal(false)
        setNewStudent({ student_code: '', full_name: '', department: 'วิศวกรรมคอมพิวเตอร์', year: 2 })
        loadStudents()
        alert(`เพิ่มสำเร็จ! รหัสผ่านเริ่มต้น: ${data.default_password}`)
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ต้องการลบ ${name} ใช่หรือไม่?`)) return
    try {
      const res = await fetch('/api/admin/students', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        loadStudents()
      } else {
        alert('ลบไม่สำเร็จ')
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleResetPassword = async (student: any) => {
    if (!confirm(`รีเซ็ตรหัสผ่านของ ${student.full_name} ใช่หรือไม่?`)) return
    try {
      const res = await fetch('/api/admin/students/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: student.id }),
      })
      const data = await res.json()
      if (res.ok) {
        alert(`รีเซ็ตสำเร็จ! รหัสผ่านใหม่: ${data.new_password}`)
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const clearFilters = () => {
    setSearch('')
    setFilterSection('')
    setFilterYear('')
    setFilterCourse('')
  }

  const hasActiveFilters = search || filterSection || filterYear || filterCourse

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">👥 จัดการนักศึกษา</h1>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-indigo-200 hover:text-white mt-1"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search & Actions */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-4">
            <input
              type="text"
              placeholder="🔍 ค้นหารหัสนักศึกษา หรือ ชื่อ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium whitespace-nowrap"
            >
              + เพิ่มนักศึกษา
            </button>
            <button
              onClick={() => router.push('/admin/students/import')}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium whitespace-nowrap"
            >
              📥 Import Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">🔽 ตัวกรองข้อมูล</h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                ✕ ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filter: Section */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">กลุ่มเรียน (Section)</label>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">-- ทุกกลุ่มเรียน --</option>
                <option value="001">กลุ่ม 001</option>
                <option value="002">กลุ่ม 002</option>
                <option value="003">กลุ่ม 003</option>
              </select>
            </div>

            {/* Filter: Year */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">ชั้นปี</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">-- ทุกชั้นปี --</option>
                <option value="1">ชั้นปี 1</option>
                <option value="2">ชั้นปี 2</option>
                <option value="3">ชั้นปี 3</option>
                <option value="4">ชั้นปี 4</option>
              </select>
            </div>

            {/* Filter: Course */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">วิชาที่ลงทะเบียน</label>
              <select
                value={filterCourse}
                onChange={(e) => setFilterCourse(e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              >
                <option value="">-- ทุกวิชา --</option>
                {courses.map((course: any) => (
                  <option key={course.course_code} value={course.course_code}>
                    {course.course_code} - {course.course_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👥</span>
              <div>
                <div className="text-xs text-indigo-600">แสดงอยู่</div>
                <div className="text-lg font-bold text-indigo-900">{totalStudents} คน</div>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="text-xs text-indigo-600 border-l border-indigo-300 pl-4">
                (กรองจากทั้งหมด)
              </div>
            )}
          </div>
          <div className="text-xs text-indigo-600">
            เรียงตาม: รหัสนักศึกษา (น้อย → มาก)
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">⏳ กำลังโหลดข้อมูล...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {hasActiveFilters ? 'ไม่พบข้อมูลที่ตรงกับตัวกรอง' : 'ไม่พบข้อมูลนักศึกษา'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">รหัส</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">อีเมล</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สาขา</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ปี</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">กลุ่มเรียน</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">สถานะ</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((s, idx) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 text-sm font-mono font-medium">{s.student_code}</td>
                      <td className="px-4 py-3 text-sm font-medium">{s.full_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {s.email ? (
                          <span className="text-green-600">✓ {s.email}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">{s.department || 'วิศวกรรมคอมพิวเตอร์'}</td>
                      <td className="px-4 py-3 text-sm">{s.year || '-'}</td>
                      <td className="px-4 py-3 text-sm font-mono text-indigo-600">
                        {s.section || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {s.email_verified ? (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                            ✓ ยืนยันแล้ว
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                             รอตั้งรหัส
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right space-x-2">
                        <button
                          onClick={() => handleResetPassword(s)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium px-2 py-1 rounded hover:bg-indigo-50"
                        >
                          รีเซ็ต
                        </button>
                        <button
                          onClick={() => handleDelete(s.id, s.full_name)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                        >
                          ลบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Stats */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
          <div>
            แสดง {students.length} คน จากทั้งหมด {totalStudents} คน
          </div>
          {hasActiveFilters && (
            <div className="flex gap-2 flex-wrap">
              {search && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">🔍 "{search}"</span>}
              {filterSection && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">📚 กลุ่ม {filterSection}</span>}
              {filterYear && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">🎓 ปี {filterYear}</span>}
              {filterCourse && <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">📖 {filterCourse}</span>}
            </div>
          )}
        </div>
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">เพิ่มนักศึกษาใหม่</h2>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">รหัสนักศึกษา *</label>
                <input
                  type="text"
                  required
                  value={newStudent.student_code}
                  onChange={(e) => setNewStudent({ ...newStudent, student_code: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น 68122519001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น นายสมชาย ใจดี"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">สาขา</label>
                <input
                  type="text"
                  value={newStudent.department}
                  onChange={(e) => setNewStudent({ ...newStudent, department: e.target.value })}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">สาขาวิศวกรรมคอมพิวเตอร์ (ค่าเริ่มต้น)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">ชั้นปี</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={newStudent.year}
                  onChange={(e) => setNewStudent({ ...newStudent, year: parseInt(e.target.value) })}
                  className="mt-1 w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}