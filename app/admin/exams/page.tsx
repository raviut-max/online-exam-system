'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminExamsPage() {
  const [exams, setExams] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSessionModal, setShowSessionModal] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null)
  const [filterCourse, setFilterCourse] = useState('')
  const router = useRouter()

  const [newExam, setNewExam] = useState({
    course_id: '',
    title: '',
    description: '',
    exam_type: 'midterm',
    duration_minutes: 60,
    passing_score: 50,
    max_attempts: 1,
    shuffle_questions: false,
    shuffle_options: false,
  })

  const [newSession, setNewSession] = useState({
    title: '',
    time_mode: 'fixed',
    start_time: '',
    end_time: '',
    target_sections: ['*'],
    max_attempts_override: null as number | null,
  })

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (!storedAdmin) {
      router.push('/admin-login')
      return
    }
    loadCourses()
    loadExams()
  }, [router])

  const loadCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses')
      const data = await res.json()
      if (res.ok) {
        const uniqueCourses: any[] = []
        const seen = new Set<string>()
        for (const course of data.courses || []) {
          if (!seen.has(course.course_code)) {
            seen.add(course.course_code)
            uniqueCourses.push(course)
          }
        }
        setCourses(uniqueCourses)
      }
    } catch (err) {
      console.error('Failed to load courses')
    }
  }

  const loadExams = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCourse) params.set('course_code', filterCourse)
      
      const res = await fetch(`/api/admin/exams?${params.toString()}`)
      const data = await res.json()
      if (res.ok) setExams(data.exams)
    } catch (err) {
      console.error('Failed to load exams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadExams()
  }, [filterCourse])

  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExam),
      })
      const data = await res.json()
      if (res.ok) {
        setShowCreateModal(false)
        setNewExam({
          course_id: '',
          title: '',
          description: '',
          exam_type: 'midterm',
          duration_minutes: 60,
          passing_score: 50,
          max_attempts: 1,
          shuffle_questions: false,
          shuffle_options: false,
        })
        loadExams()
        alert('สร้างข้อสอบสำเร็จ! อย่าลืมสร้างรอบสอบ (Session)')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedExamId) return

    try {
      const res = await fetch(`/api/admin/exams/${selectedExamId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession),
      })
      const data = await res.json()
      if (res.ok) {
        setShowSessionModal(false)
        setSelectedExamId(null)
        setNewSession({
          title: '',
          time_mode: 'fixed',
          start_time: '',
          end_time: '',
          target_sections: ['*'],
          max_attempts_override: null,
        })
        loadExams()
        alert('สร้างรอบสอบสำเร็จ!')
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDeleteExam = async (id: string, title: string) => {
    if (!confirm(`ต้องการลบข้อสอบ "${title}" ใช่หรือไม่?\n(โจทย์และรอบสอบทั้งหมดจะถูกลบด้วย)`)) return
    try {
      const res = await fetch('/api/admin/exams', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (res.ok) {
        loadExams()
      } else {
        alert('ลบไม่สำเร็จ')
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDeleteSession = async (sessionId: string, examId: string, title: string) => {
    if (!confirm(`ต้องการลบรอบสอบ "${title}" ใช่หรือไม่?`)) return
    try {
      const res = await fetch(`/api/admin/exams/sessions/${sessionId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        loadExams()
      } else {
        alert('ลบไม่สำเร็จ')
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const toggleSession = async (sessionId: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/exams/sessions/${sessionId}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      })
      if (res.ok) {
        loadExams()
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleExportExam = async (exam: any) => {
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}/export`)
      const data = await res.json()
      
      if (res.ok) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${exam.course_code || 'exam'}-${exam.title.replace(/\s+/g, '-')}.json`
        a.click()
        URL.revokeObjectURL(url)
      } else {
        alert(data.error)
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการ Export')
    }
  }

  const getExamTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      midterm: '📗 กลางภาค',
      final: '📕 ปลายภาค',
      quiz: '📝 ควิซ',
      practice: '📚 ฝึกหัด',
    }
    return labels[type] || type
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  // สรุปสถิติ
  const totalExams = exams.length
  const totalSessions = exams.reduce((sum: number, exam: any) => sum + (exam.exam_sessions?.length || 0), 0)
  const activeSessions = exams.reduce((sum: number, exam: any) => 
    sum + (exam.exam_sessions?.filter((s: any) => s.is_active).length || 0), 0
  )

  // สรุปแยกตามวิชา
  const groupedByCourse = exams.reduce((acc: any, exam: any) => {
    const key = `${exam.course_code || exam.courses?.course_code || '-'} - ${exam.courses?.course_name || '-'}`
    if (!acc[key]) acc[key] = []
    acc[key].push(exam)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">📝 จัดการข้อสอบ</h1>
          <p className="text-sm text-indigo-200 mt-1">Exam Templates & Sessions</p>
          <button
            onClick={() => router.push('/admin')}
            className="text-sm text-indigo-200 hover:text-white mt-1"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Toolbar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-md"
          >
            <option value="">-- ทุกวิชา --</option>
            {courses.map((c: any) => (
              <option key={c.course_code} value={c.course_code}>
                {c.course_code} - {c.course_name}
              </option>
            ))}
          </select>
          <button
            onClick={() => router.push('/admin/exams/import')}
            className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium whitespace-nowrap"
          >
            📥 Import JSON
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium whitespace-nowrap"
          >
            + สร้างข้อสอบใหม่
          </button>
        </div>

        {/* สรุปสถิติ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="text-sm text-gray-500">📚 จำนวนชุดข้อสอบ</div>
            <div className="text-3xl font-bold text-indigo-700">{totalExams} ชุด</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">🗓️ จำนวนรอบสอบทั้งหมด</div>
            <div className="text-3xl font-bold text-blue-700">{totalSessions} รอบ</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">🟢 รอบที่เปิดสอบ</div>
            <div className="text-3xl font-bold text-green-700">{activeSessions} รอบ</div>
          </div>
        </div>

        {/* สรุปแยกตามวิชา */}
        {exams.length > 0 && (
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">📊 สรุปข้อสอบแยกตามวิชา</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(groupedByCourse).map(([courseName, courseExams]: [string, any]) => (
                <div key={courseName} className="border rounded-lg p-3 bg-gray-50">
                  <div className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <span className="text-lg">📖</span>
                    {courseName}
                    <span className="ml-auto text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                      {(courseExams as any[]).length} ชุด
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    {(courseExams as any[]).map((exam: any) => (
                      <div key={exam.id} className="bg-white px-2 py-1 rounded">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-700">
                            {exam.exam_type === 'midterm' ? '📗' : exam.exam_type === 'final' ? '📕' : '📝'} {exam.title}
                          </span>
                          <span className="text-xs text-gray-500">
                            {exam.exam_sessions?.length || 0} รอบ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exams List with Sessions */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">⏳ กำลังโหลด...</div>
        ) : exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            ยังไม่มีข้อสอบในระบบ
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam: any) => {
              const sessions = exam.exam_sessions || []
              const activeSessionCount = sessions.filter((s: any) => s.is_active).length

              return (
                <div
                  key={exam.id}
                  className="bg-white rounded-lg shadow overflow-hidden border-l-4 border-indigo-500"
                >
                  {/* Exam Header */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 border-b">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded font-medium">
                            {getExamTypeLabel(exam.exam_type)}
                          </span>
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                            {exam.course_code || exam.courses?.course_code}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {exam.courses?.course_name}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-500">⏱️ เวลาทำ</div>
                        <div className="font-semibold">{exam.duration_minutes} นาที</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-500">🎯 คะแนนผ่าน</div>
                        <div className="font-semibold">{exam.passing_score}%</div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-500">📝 จำนวนข้อ</div>
                        <div className="font-semibold">
                          {sessions.reduce((sum: number, s: any) => sum + (s.question_count || 0), 0) || '-'}
                        </div>
                      </div>
                      <div className="bg-white rounded p-2">
                        <div className="text-xs text-gray-500">🔄 สุ่ม</div>
                        <div className="font-semibold">
                          {exam.shuffle_questions ? 'โจทย์ ✓' : ''} {exam.shuffle_options ? 'ตัวเลือก ✓' : ''}
                        </div>
                      </div>
                    </div>

                    {exam.description && (
                      <p className="text-sm text-gray-500 mt-3 italic border-l-2 border-gray-300 pl-3">
                        "{exam.description}"
                      </p>
                    )}
                  </div>

                  {/* Sessions Section */}
                  <div className="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                        🗓️ รอบสอบ
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {sessions.length} รอบ ({activeSessionCount} เปิด)
                        </span>
                      </h4>
                      <button
                        onClick={() => {
                          setSelectedExamId(exam.id)
                          setShowSessionModal(true)
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                      >
                        + เพิ่มรอบสอบ
                      </button>
                    </div>

                    {sessions.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg">
                        <div className="text-4xl mb-2">📭</div>
                        <p className="text-gray-500">ยังไม่มีรอบสอบ</p>
                        <p className="text-xs text-gray-400 mt-1">กดปุ่ม "+ เพิ่มรอบสอบ" เพื่อเริ่มจัดสอบ</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessions.map((session: any) => (
                          <div
                            key={session.id}
                            className={`border rounded-lg p-4 ${
                              session.is_active 
                                ? 'bg-green-50 border-green-200' 
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                                    session.is_active 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-200 text-gray-600'
                                  }`}>
                                    {session.is_active ? '🟢 เปิด' : '⚪ ปิด'}
                                  </span>
                                  <span className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700">
                                    {session.time_mode === 'fixed' ? '📅 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                                  </span>
                                  {session.target_sections?.includes('*') ? (
                                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                                      👥 ทุกกลุ่ม
                                    </span>
                                  ) : (
                                    <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
                                      👥 กลุ่ม {session.target_sections?.join(', ')}
                                    </span>
                                  )}
                                </div>
                                <h5 className="font-semibold text-gray-900">{session.title}</h5>
                                <div className="text-sm text-gray-600 mt-1">
                                  {session.time_mode === 'fixed' ? (
                                    <>
                                      📅 {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                                    </>
                                  ) : (
                                    <>
                                      📅 {formatDate(session.start_time)} - {formatDate(session.end_time)}
                                      <span className="text-xs text-gray-500 ml-2">
                                        (นักศึกษาเลือกเวลาเริ่มเอง)
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => toggleSession(session.id, session.is_active)}
                                  className={`px-3 py-1 rounded text-xs font-medium ${
                                    session.is_active
                                      ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                      : 'bg-green-500 text-white hover:bg-green-600'
                                  }`}
                                >
                                  {session.is_active ? '⏸️ ปิด' : '▶️ เปิด'}
                                </button>
                                <button
                                  onClick={() => handleDeleteSession(session.id, exam.id, session.title)}
                                  className="px-3 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="bg-gray-50 px-6 py-4 border-t flex flex-wrap gap-2">
                    <button
                      onClick={() => router.push(`/admin/exams/${exam.id}`)}
                      className="flex-1 min-w-[120px] px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                    >
                      ✏️ จัดการโจทย์
                    </button>
                    <button
                      onClick={() => router.push(`/admin/exams/${exam.id}/results`)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      📊 ผลสอบ
                    </button>
                    <button
                      onClick={() => handleExportExam(exam)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium"
                    >
                      📤 Export
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm font-medium"
                    >
                      🗑️ ลบข้อสอบ
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4">📝 สร้างข้อสอบใหม่ (Template)</h2>
            <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded">
              💡 ขั้นตอนนี้สร้างเฉพาะ <strong>ตัวข้อสอบ (Template)</strong> เท่านั้น 
              หลังจากสร้างแล้วต้อง <strong>เพิ่มรอบสอบ (Session)</strong> ก่อนจึงจะให้นักศึกษาทำได้
            </p>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">วิชา *</label>
                  <select
                    required
                    value={newExam.course_id}
                    onChange={(e) => setNewExam({ ...newExam, course_id: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    <option value="">-- เลือกวิชา --</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.course_code} - {c.course_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">ชื่อข้อสอบ *</label>
                  <input
                    type="text"
                    required
                    value={newExam.title}
                    onChange={(e) => setNewExam({ ...newExam, title: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="เช่น สอบกลางภาค 1/2569"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">รายละเอียด</label>
                  <textarea
                    value={newExam.description}
                    onChange={(e) => setNewExam({ ...newExam, description: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">ประเภท</label>
                  <select
                    value={newExam.exam_type}
                    onChange={(e) => setNewExam({ ...newExam, exam_type: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  >
                    <option value="midterm">📗 กลางภาค</option>
                    <option value="final">📕 ปลายภาค</option>
                    <option value="quiz">📝 ควิซ</option>
                    <option value="practice">📚 ฝึกหัด</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">เวลาทำ (นาที) *</label>
                  <input
                    type="number"
                    required
                    min="5"
                    value={newExam.duration_minutes}
                    onChange={(e) => setNewExam({ ...newExam, duration_minutes: parseInt(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">คะแนนผ่าน (%) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="100"
                    value={newExam.passing_score}
                    onChange={(e) => setNewExam({ ...newExam, passing_score: parseInt(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">จำนวนครั้งที่ทำได้</label>
                  <input
                    type="number"
                    min="1"
                    value={newExam.max_attempts}
                    onChange={(e) => setNewExam({ ...newExam, max_attempts: parseInt(e.target.value) })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>

                <div className="md:col-span-2 flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newExam.shuffle_questions}
                      onChange={(e) => setNewExam({ ...newExam, shuffle_questions: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">🔀 สุ่มลำดับโจทย์</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newExam.shuffle_options}
                      onChange={(e) => setNewExam({ ...newExam, shuffle_options: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-gray-700">🎲 สุ่มลำดับตัวเลือก</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  สร้างข้อสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 my-8">
            <h2 className="text-xl font-bold mb-4">🗓️ เพิ่มรอบสอบใหม่</h2>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">ชื่อรอบสอบ *</label>
                  <input
                    type="text"
                    required
                    value={newSession.title}
                    onChange={(e) => setNewSession({ ...newSession, title: e.target.value })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="เช่น กลางภาค กลุ่ม 001, สอบซ่อม, แบบฝึกหัด"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">⏰ โหมดเวลาสอบ</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNewSession({ ...newSession, time_mode: 'fixed' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        newSession.time_mode === 'fixed'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">📅 แบบระบุเวลา</div>
                      <div className="text-xs text-gray-600 mt-1">
                        สอบพร้อมกันทุกคน<br />
                        (เช่น สอบกลางภาค/ปลายภาค)
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewSession({ ...newSession, time_mode: 'flexible' })}
                      className={`p-4 border-2 rounded-lg text-left transition-all ${
                        newSession.time_mode === 'flexible'
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-gray-900">🔄 แบบยืดหยุ่น</div>
                      <div className="text-xs text-gray-600 mt-1">
                        เลือกทำเองได้<br />
                        (เช่น quiz, แบบฝึกหัด)
                      </div>
                    </button>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {newSession.time_mode === 'fixed' 
                      ? '📅 วันและเวลาสอบ *' 
                      : '📅 ช่วงเวลาทำข้อสอบ *'}
                  </label>
                  {newSession.time_mode === 'fixed' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600">เริ่ม</label>
                        <input
                          type="datetime-local"
                          required
                          value={newSession.start_time}
                          onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">สิ้นสุด</label>
                        <input
                          type="datetime-local"
                          required
                          value={newSession.end_time}
                          onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600">วันเริ่ม *</label>
                        <input
                          type="date"
                          required
                          value={newSession.start_time?.split('T')[0]}
                          onChange={(e) => setNewSession({ ...newSession, start_time: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600">วันสิ้นสุด *</label>
                        <input
                          type="date"
                          required
                          value={newSession.end_time?.split('T')[0]}
                          onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    {newSession.time_mode === 'fixed' 
                      ? 'นักศึกษาต้องทำข้อสอบในช่วงเวลานี้เท่านั้น'
                      : 'นักศึกษาสามารถเลือกเวลาเริ่มทำเองได้ภายในช่วงนี้'}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    จำนวนครั้งสูงสุด (เว้นว่าง = ใช้ค่าจากข้อสอบ)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newSession.max_attempts_override || ''}
                    onChange={(e) => setNewSession({ 
                      ...newSession, 
                      max_attempts_override: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                    placeholder="เช่น 1, 2, 3"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowSessionModal(false)
                    setSelectedExamId(null)
                  }}
                  className="flex-1 px-4 py-2 border rounded-md hover:bg-gray-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  สร้างรอบสอบ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}