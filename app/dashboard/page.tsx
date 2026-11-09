'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [student, setStudent] = useState<any>(null)
  const [availableExams, setAvailableExams] = useState<any[]>([])
  const [upcomingExams, setUpcomingExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const router = useRouter()

  useEffect(() => {
    // โหลดข้อมูลนักศึกษาจาก localStorage
    const storedStudent = localStorage.getItem('student')
    if (!storedStudent) {
      router.push('/login')
      return
    }
    const studentData = JSON.parse(storedStudent)
    setStudent(studentData)
    
    // โหลดข้อสอบ
    loadExams(studentData.id)
  }, [router])

  // ⭐ นับถอยหลังทุก 1 วินาที
  useEffect(() => {
    if (upcomingExams.length === 0) return

    const interval = setInterval(() => {
      const newCountdowns: Record<string, string> = {}
      upcomingExams.forEach((exam: any) => {
        exam.sessions.forEach((session: any) => {
          const startTime = new Date(session.start_time).getTime()
          const now = Date.now()
          const diff = startTime - now

          if (diff > 0) {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24))
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
            const seconds = Math.floor((diff % (1000 * 60)) / 1000)
            newCountdowns[session.id] = `${days}d ${hours}h ${minutes}m ${seconds}s`
          } else {
            newCountdowns[session.id] = 'เริ่มแล้ว!'
          }
        })
      })
      setCountdowns(newCountdowns)
    }, 1000)

    return () => clearInterval(interval)
  }, [upcomingExams])

  const loadExams = async (studentId: string) => {
    setLoading(true)
    setError('')
    
    try {
      console.log('🔍 [Dashboard] กำลังโหลดข้อสอบสำหรับนักศึกษา:', studentId)
      
      const res = await fetch('/api/student/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id: studentId,
          client_time: new Date().toISOString()
        }),
      })

      const data = await res.json()
      console.log('📦 [Dashboard] API Response:', data)

      if (!res.ok) {
        setError(data.error || 'ไม่สามารถโหลดข้อมูลได้')
        return
      }

      setAvailableExams(data.available_exams || [])
      setUpcomingExams(data.upcoming_exams || [])
      console.log('✅ [Dashboard] Available:', data.available_exams?.length || 0, 
                  'Upcoming:', data.upcoming_exams?.length || 0)
    } catch (err: any) {
      console.error('❌ [Dashboard] Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      setLoading(false)
    }
  }

  const handleStartExam = async (examId: string, sessionId: string) => {
    if (!student) return
    
    try {
      const res = await fetch(`/api/student/exams/${examId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          student_id: student.id,
          session_id: sessionId 
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'ไม่สามารถเริ่มทำข้อสอบได้')
        return
      }

      sessionStorage.setItem('current_exam', JSON.stringify({
        exam_id: examId,
        session_id: sessionId,
        attempt_id: data.attempt_id,
        questions: data.questions,
        started_at: data.started_at,
        duration_minutes: data.exam.duration_minutes,
      }))

      router.push(`/student/exam/${examId}`)
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการเริ่มทำข้อสอบ')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('student')
    router.push('/login')
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

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">🎓 ระบบสอบออนไลน์</h1>
            <p className="text-sm text-blue-100">Dashboard นักศึกษา</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm">
              สวัสดี, <strong>{student.full_name}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 font-medium transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            ❌ {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-gray-500">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <>
            {/* ⭐ ส่วนที่ 1: ข้อสอบที่เปิดให้ทำได้ตอนนี้ */}
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                ✅ ข้อสอบที่เปิดให้ทำได้ตอนนี้ ({availableExams.length})
              </h2>

              {availableExams.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="text-5xl mb-3">📭</div>
                  <p className="text-gray-500">ยังไม่มีข้อสอบที่เปิดให้ทำในขณะนี้</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {availableExams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="bg-white rounded-lg shadow-md border-l-4 border-green-500 overflow-hidden"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                                {exam.exam_type === 'quiz' ? '📝 ควิซ' : '📋 สอบ'}
                              </span>
                              <span className="text-sm text-gray-600">
                                {exam.course_code} - {exam.courses?.course_name}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {exam.title}
                            </h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 italic">
                                "{exam.description}"
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs text-gray-500">ระยะเวลาทำ</div>
                            <div className="text-2xl font-bold text-green-600">
                              {exam.duration_minutes} <span className="text-sm">นาที</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            📅 รอบสอบที่พร้อมทำ:
                          </h4>
                          <div className="space-y-3">
                            {exam.sessions.map((session: any) => (
                              <div
                                key={session.id}
                                className="bg-green-50 rounded-lg p-4 border border-green-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium">
                                      {session.time_mode === 'fixed' ? '🕐 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                      {session.title}
                                    </span>
                                  </div>
                                  <span className="text-xs text-green-700 font-bold">
                                    ✅ เปิดอยู่
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                                  <div>🕐 เปิด: {formatDateTime(session.start_time)}</div>
                                  <div>🏁 ปิด: {formatDateTime(session.end_time)}</div>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm">
                                    <span className="text-gray-500">ทำได้เหลือ </span>
                                    <strong className="text-green-600">{session.attempts_remaining}</strong>
                                    <span className="text-gray-500"> ครั้ง</span>
                                  </div>
                                  <button
                                    onClick={() => handleStartExam(exam.id, session.id)}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition flex items-center gap-2"
                                  >
                                    ▶️ เริ่มทำข้อสอบ
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ⭐ ส่วนที่ 2: ข้อสอบที่จะมาถึงในอนาคต */}
            <section>
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                ⏳ ข้อสอบที่จะมาถึง ({upcomingExams.length})
              </h2>

              {upcomingExams.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                  <div className="text-5xl mb-3">🎉</div>
                  <p className="text-gray-500">ไม่มีข้อสอบที่กำหนดไว้ในอนาคต</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {upcomingExams.map((exam: any) => (
                    <div
                      key={exam.id}
                      className="bg-white rounded-lg shadow-md border-l-4 border-orange-500 overflow-hidden opacity-90"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                                {exam.exam_type === 'quiz' ? '📝 ควิซ' : '📋 สอบ'}
                              </span>
                              <span className="text-sm text-gray-600">
                                {exam.course_code} - {exam.courses?.course_name}
                              </span>
                            </div>
                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                              {exam.title}
                            </h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 italic">
                                "{exam.description}"
                              </p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-xs text-gray-500">ระยะเวลาทำ</div>
                            <div className="text-2xl font-bold text-orange-600">
                              {exam.duration_minutes} <span className="text-sm">นาที</span>
                            </div>
                          </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            📅 รอบสอบที่กำหนดไว้:
                          </h4>
                          <div className="space-y-3">
                            {exam.sessions.map((session: any) => (
                              <div
                                key={session.id}
                                className="bg-orange-50 rounded-lg p-4 border border-orange-200"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">
                                      {session.time_mode === 'fixed' ? '🕐 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                                    </span>
                                    <span className="font-semibold text-gray-800">
                                      {session.title}
                                    </span>
                                  </div>
                                  <span className="text-xs text-orange-700 font-bold">
                                    ⏳ ยังไม่เริ่ม
                                  </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                                  <div>🕐 เปิด: {formatDateTime(session.start_time)}</div>
                                  <div>🏁 ปิด: {formatDateTime(session.end_time)}</div>
                                </div>

                                {/* ⭐ นับถอยหลัง */}
                                <div className="bg-white rounded-lg p-3 text-center border border-orange-200">
                                  <div className="text-xs text-gray-500 mb-1">จะเริ่มในอีก</div>
                                  <div className="text-2xl font-bold text-orange-600 font-mono">
                                    {countdowns[session.id] || 'กำลังคำนวณ...'}
                                  </div>
                                </div>

                                <div className="mt-3 text-sm text-gray-500 text-center">
                                  ทำได้อีก {session.attempts_remaining} ครั้ง
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}