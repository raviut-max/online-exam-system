'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamDetailClient({ examId }: { examId: string }) {
  const router = useRouter()

  const [exam, setExam] = useState<any>(null)
  const [sessions, setSessions] = useState<any[]>([])
  const [questions, setQuestions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // State สำหรับฟอร์มเพิ่มรอบสอบ
  const [showAddSession, setShowAddSession] = useState(false)
  const [newSessionTitle, setNewSessionTitle] = useState('')
  const [newSessionTimeMode, setNewSessionTimeMode] = useState('flexible')
  const [newSessionStartTime, setNewSessionStartTime] = useState('')
  const [newSessionEndTime, setNewSessionEndTime] = useState('')
  const [newSessionMaxAttempts, setNewSessionMaxAttempts] = useState('')
  const [newSessionSection, setNewSessionSection] = useState('')

  useEffect(() => {
    if (examId) {
      loadExamData()
    }
  }, [examId])

  const loadExamData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch(`/api/admin/exams/${examId}`)
      const data = await res.json()
      
      if (!res.ok) {
        setError(data.error || 'ไม่สามารถโหลดข้อมูลได้')
        return
      }

      setExam(data.exam)
      setSessions(data.sessions || [])
      setQuestions(data.questions || [])
    } catch (err) {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handleAddSession = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newSessionTitle || !newSessionStartTime || !newSessionEndTime) {
      alert('กรุณากรอกข้อมูลให้ครบ')
      return
    }

    if (new Date(newSessionStartTime) >= new Date(newSessionEndTime)) {
      alert('เวลาสิ้นสุดต้องมากกว่าเวลาเริ่ม')
      return
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newSessionTitle,
          time_mode: newSessionTimeMode,
          start_time: new Date(newSessionStartTime).toISOString(),
          end_time: new Date(newSessionEndTime).toISOString(),
          max_attempts_override: newSessionMaxAttempts ? parseInt(newSessionMaxAttempts) : null,
          section: newSessionSection || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'ไม่สามารถสร้างรอบสอบได้')
        return
      }

      alert('✅ สร้างรอบสอบสำเร็จ')
      setShowAddSession(false)
      setNewSessionTitle('')
      setNewSessionStartTime('')
      setNewSessionEndTime('')
      setNewSessionMaxAttempts('')
      setNewSessionSection('')
      
      loadExamData()
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleToggleSession = async (sessionId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/admin/exams/${examId}/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'ไม่สามารถอัพเดทรอบสอบได้')
        return
      }

      loadExamData()
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบรอบสอบนี้?\n\nผลการสอบทั้งหมดในรอบนี้จะถูกลบด้วย!')) {
      return
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}/sessions/${sessionId}`, {
        method: 'DELETE',
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'ไม่สามารถลบรอบสอบได้')
        return
      }

      alert('✅ ลบรอบสอบสำเร็จ')
      loadExamData()
    } catch (err) {
      alert('เกิดข้อผิดพลาด')
    }
  }

  const formatDateTime = (dateString: string) => {
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

  if (loading) {
    return null // Suspense ใน page.tsx จะจัดการแสดง fallback ให้
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          ❌ {error}
        </div>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">ไม่พบข้อมูลข้อสอบ</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <button 
            onClick={() => router.push('/admin/exams')} 
            className="text-sm text-indigo-200 hover:text-white mb-2"
          >
            ← กลับหน้าจัดการข้อสอบ
          </button>
          <h1 className="text-2xl font-bold">{exam.title}</h1>
          <p className="text-sm text-indigo-200 mt-1">
            {exam.course_code} | คะแนนผ่าน: {exam.passing_score}% | ระยะเวลา: {exam.duration_minutes} นาที
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">📝 จำนวนโจทย์</div>
            <div className="text-3xl font-bold text-blue-700">{questions.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">📅 จำนวนรอบสอบ</div>
            <div className="text-3xl font-bold text-green-700">{sessions.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-500">🟢 รอบที่เปิด</div>
            <div className="text-3xl font-bold text-purple-700">
              {sessions.filter((s: any) => s.is_active).length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-500">⚪ รอบที่ปิด</div>
            <div className="text-3xl font-bold text-yellow-700">
              {sessions.filter((s: any) => !s.is_active).length}
            </div>
          </div>
        </div>

        {/* Exam Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📋 ข้อมูลข้อสอบ</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-xs text-gray-500">เวลาทำ</div>
              <div className="font-semibold">{exam.duration_minutes} นาที</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">คะแนนผ่าน</div>
              <div className="font-semibold">{exam.passing_score}%</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">จำนวนครั้งสูงสุด</div>
              <div className="font-semibold">{exam.max_attempts || 'ไม่จำกัด'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">การสุ่ม</div>
              <div className="font-semibold">
                โจทย์ {exam.shuffle_questions ? '✓' : '✗'} | ตัวเลือก {exam.shuffle_options ? '✓' : '✗'}
              </div>
            </div>
          </div>
          {exam.description && (
            <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
              {exam.description}
            </div>
          )}
        </div>

        {/* Sessions Management */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              📅 รอบสอบ ({sessions.length} รอบ)
            </h2>
            <button
              onClick={() => setShowAddSession(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              ➕ เพิ่มรอบสอบ
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>ยังไม่มีรอบสอบ กดปุ่ม "เพิ่มรอบสอบ" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session: any) => {
                const now = new Date()
                const startTime = new Date(session.start_time)
                const endTime = new Date(session.end_time)
                
                let statusBadge = ''
                let statusColor = ''
                
                if (!session.is_active) {
                  statusBadge = '⚪ ปิด'
                  statusColor = 'bg-gray-100 text-gray-700'
                } else if (now < startTime) {
                  statusBadge = '⏳ ยังไม่เริ่ม'
                  statusColor = 'bg-yellow-100 text-yellow-700'
                } else if (now > endTime) {
                  statusBadge = '🔚 หมดเวลา'
                  statusColor = 'bg-red-100 text-red-700'
                } else {
                  statusBadge = '🟢 กำลังเปิด'
                  statusColor = 'bg-green-100 text-green-700'
                }

                return (
                  <div
                    key={session.id}
                    className={`border rounded-lg p-4 ${
                      session.is_active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${statusColor}`}>
                            {statusBadge}
                          </span>
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                            {session.time_mode === 'fixed' ? '🕐 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                          </span>
                          {session.section && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                              กลุ่ม {session.section}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-gray-800">{session.title}</h3>
                        <div className="text-sm text-gray-600 mt-1">
                          📅 {formatDateTime(session.start_time)} - {formatDateTime(session.end_time)}
                        </div>
                        {session.max_attempts_override && (
                          <div className="text-xs text-gray-500 mt-1">
                            จำนวนครั้งสูงสุด: {session.max_attempts_override}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleToggleSession(session.id, session.is_active)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            session.is_active 
                              ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                              : 'bg-green-500 text-white hover:bg-green-600'
                          }`}
                        >
                          {session.is_active ? '⏸️ ปิด' : '▶️ เปิด'}
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600"
                        >
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push(`/admin/exams/${examId}/edit`)}
            className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            ✏️ จัดการโจทย์
          </button>
          <button
            onClick={() => router.push(`/admin/exams/${examId}/results`)}
            className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            📊 ผลสอบ
          </button>
          <button
            onClick={() => router.push(`/admin/exams/${examId}/export`)}
            className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            📥 Export
          </button>
          <button
            onClick={() => {
              if (confirm('⚠️ คุณแน่ใจหรือไม่ที่จะลบข้อสอบนี้?\n\nข้อมูลทั้งหมดจะถูกลบ!')) {
                // สามารถเพิ่ม API ลบข้อสอบที่นี่
              }
            }}
            className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
          >
            🗑️ ลบข้อสอบ
          </button>
        </div>
      </main>

      {/* Modal เพิ่มรอบสอบ */}
      {showAddSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">➕ เพิ่มรอบสอบใหม่</h3>
            
            <form onSubmit={handleAddSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ชื่อรอบสอบ *
                </label>
                <input
                  type="text"
                  value={newSessionTitle}
                  onChange={(e) => setNewSessionTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น รอบเช้า, รอบบ่าย"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  โหมดเวลา
                </label>
                <select
                  value={newSessionTimeMode}
                  onChange={(e) => setNewSessionTimeMode(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="flexible">🔄 ยืดหยุ่น</option>
                  <option value="fixed">🕐 ระบุเวลา</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เวลาเริ่ม *
                </label>
                <input
                  type="datetime-local"
                  value={newSessionStartTime}
                  onChange={(e) => setNewSessionStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  เวลาสิ้นสุด *
                </label>
                <input
                  type="datetime-local"
                  value={newSessionEndTime}
                  onChange={(e) => setNewSessionEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  จำนวนครั้งสูงสุด (เว้นว่าง = ใช้ค่าเริ่มต้น)
                </label>
                <input
                  type="number"
                  value={newSessionMaxAttempts}
                  onChange={(e) => setNewSessionMaxAttempts(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น 2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  กลุ่ม (เว้นว่าง = ทุกกลุ่ม)
                </label>
                <input
                  type="text"
                  value={newSessionSection}
                  onChange={(e) => setNewSessionSection(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="เช่น 001"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  ✅ สร้างรอบสอบ
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddSession(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                >
                  ❌ ยกเลิก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}