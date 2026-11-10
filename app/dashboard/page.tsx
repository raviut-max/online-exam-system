'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const [student, setStudent] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [countdowns, setCountdowns] = useState<Record<string, string>>({})
  const [currentTime, setCurrentTime] = useState<number>(0)
  const router = useRouter()

  // 1. โหลดข้อมูลนักศึกษาและเริ่มจับเวลา
  useEffect(() => {
    const storedStudent = localStorage.getItem('student')
    if (!storedStudent) {
      console.log('⚠️ [Dashboard] ไม่พบข้อมูลนักศึกษาใน localStorage')
      router.push('/login')
      return
    }
    const studentData = JSON.parse(storedStudent)
    console.log('👤 [Dashboard] นักศึกษา:', studentData)
    setStudent(studentData)
    setCurrentTime(Date.now())
    loadExams(studentData.id)
  }, [router])

  // 2. อัพเดทเวลาทุก 1 วินาที
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 3. Auto-reload ทุก 5 วินาที
  useEffect(() => {
    if (!student) return
    const reloadTimer = setInterval(() => {
      console.log('🔄 [Dashboard] Auto-reload...')
      loadExams(student.id, true)
    }, 5000)
    return () => clearInterval(reloadTimer)
  }, [student])

  // 4. ฟังก์ชันแปลงเวลาแบบปลอดภัย
  const parseTime = (timeStr: string | null | undefined): number | null => {
    if (!timeStr) {
      console.warn('  ⚠️ parseTime: timeStr เป็น null/undefined')
      return null
    }
    try {
      const hasTimezone = timeStr.includes('Z') || /[+-]\d{2}:\d{2}$/.test(timeStr)
      const dateStr = hasTimezone ? timeStr : timeStr + '+07:00'
      const time = new Date(dateStr).getTime()
      if (isNaN(time)) {
        console.warn(`⚠️ parseTime: ได้ NaN จาก "${timeStr}"`)
        return null
      }
      return time
    } catch (e) {
      console.warn(`⚠️ parseTime: error จาก "${timeStr}"`, e)
      return null
    }
  }

  // 5. นับถอยหลัง
  useEffect(() => {
    if (currentTime === 0 || exams.length === 0) return
    const newCountdowns: Record<string, string> = {}
    let hasUpcoming = false

    exams.forEach((exam: any) => {
      exam.sessions?.forEach((session: any) => {
        const startTime = parseTime(session.start_time)
        if (!startTime) return
        const diff = startTime - currentTime
        if (diff > 0) {
          hasUpcoming = true
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

    setCountdowns((prev) => {
      if (JSON.stringify(prev) === JSON.stringify(newCountdowns) && !hasUpcoming) {
        return prev
      }
      return newCountdowns
    })
  }, [exams, currentTime])

  // 6. แยก available/upcoming พร้อม Debug Log
  const { availableExams, upcomingExams } = useMemo(() => {
    console.log('🔍 [useMemo] เริ่มแยกข้อสอบ...')
    console.log('  - currentTime:', currentTime, new Date(currentTime).toLocaleString('th-TH'))
    console.log('  - exams.length:', exams.length)

    if (currentTime === 0 || exams.length === 0) {
      console.log('  ⏭️ ข้าม: currentTime=0 หรือไม่มี exams')
      return { availableExams: [], upcomingExams: [] }
    }

    const available: any[] = []
    const upcoming: any[] = []
    const skipped: any[] = []

    exams.forEach((exam: any, examIdx: number) => {
      console.log(`\n📝 [Exam ${examIdx + 1}] ${exam.title}`)
      console.log('  - exam_id:', exam.id)
      console.log('  - sessions:', exam.sessions?.length || 0, 'รอบ')

      const availableSessions: any[] = []
      const upcomingSessions: any[] = []

      exam.sessions?.forEach((session: any, sessIdx: number) => {
        const startTime = parseTime(session.start_time)
        const endTime = parseTime(session.end_time)
        const attemptsRemaining = session.attempts_remaining ?? 0

        console.log(`  🕐 [Session ${sessIdx + 1}] "${session.title || 'ไม่มีชื่อ'}"`)
        console.log('    - start_time raw:', session.start_time)
        console.log('    - end_time raw:', session.end_time)
        console.log('    - startTime (ms):', startTime, startTime ? new Date(startTime).toLocaleString('th-TH') : 'INVALID')
        console.log('    - endTime (ms):', endTime, endTime ? new Date(endTime).toLocaleString('th-TH') : 'INVALID')
        console.log('    - currentTime (ms):', currentTime, new Date(currentTime).toLocaleString('th-TH'))
        console.log('    - attempts_remaining:', attemptsRemaining)

        if (!startTime || !endTime) {
          console.warn('    ⚠️ ข้าม session นี้เพราะเวลาไม่ถูกต้อง (startTime หรือ endTime เป็น null)')
          skipped.push({ exam: exam.title, session: session.title, reason: 'เวลาไม่ถูกต้อง' })
          return
        }

        const isNow = currentTime >= startTime && currentTime <= endTime
        const isFuture = currentTime < startTime
        const isPast = currentTime > endTime
        const hasAttempts = attemptsRemaining > 0

        console.log('    - isNow (อยู่ในช่วง):', isNow)
        console.log('    - isFuture (ยังไม่เริ่ม):', isFuture)
        console.log('    - isPast (ผ่านแล้ว):', isPast)
        console.log('    - hasAttempts (เหลือครั้ง):', hasAttempts)

        if (isNow && hasAttempts) {
          console.log('    ✅ → เพิ่มเข้า AVAILABLE')
          availableSessions.push(session)
        } else if (isFuture && hasAttempts) {
          console.log('    ⏳ → เพิ่มเข้า UPCOMING')
          upcomingSessions.push(session)
        } else if (isPast) {
          console.log('    ❌ → ข้าม (ผ่านเวลาแล้ว)')
          skipped.push({ exam: exam.title, session: session.title, reason: 'ผ่านเวลาแล้ว' })
        } else if (!hasAttempts) {
          console.log('    ❌ → ข้าม (ทำครบจำนวนครั้งแล้ว)')
          skipped.push({ exam: exam.title, session: session.title, reason: 'ทำครบ次数แล้ว' })
        } else {
          console.log('    ❌ → ข้าม (สถานะไม่ชัดเจน)')
        }
      })

      if (availableSessions.length > 0) {
        available.push({ ...exam, sessions: availableSessions })
      }
      if (upcomingSessions.length > 0) {
        upcoming.push({ ...exam, sessions: upcomingSessions })
      }
    })

    console.log('\n📊 [useMemo] สรุปผล:')
    console.log('  - Available exams:', available.length)
    console.log('  - Upcoming exams:', upcoming.length)
    console.log('  - Skipped sessions:', skipped.length, skipped)
    console.log('========================================\n')

    return { availableExams: available, upcomingExams: upcoming }
  }, [exams, currentTime])

  // 7. ฟังก์ชันโหลดข้อสอบ
  const loadExams = async (studentId: string, isReload = false) => {
    if (!isReload) {
      setLoading(true)
    }
    setError('')
    try {
      console.log('🔍 [loadExams] โหลดข้อสอบสำหรับ student_id:', studentId)
      const res = await fetch('/api/student/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          client_time: new Date().toISOString(),
        }),
      })
      const data = await res.json()
      console.log('📦 [loadExams] API Response status:', res.status)
      console.log('📦 [loadExams] API Response data:', data)

      if (!res.ok) {
        setError(data.error || 'ไม่สามารถโหลดข้อมูลได้')
        console.error('❌ [loadExams] API Error:', data.error)
        return
      }

      const examsList = data.exams || []
      console.log('📋 [loadExams] จำนวนข้อสอบที่ได้:', examsList.length)

      if (examsList.length > 0) {
        console.log('📋 [loadExams] ตัวอย่างข้อสอบแรก:', {
          id: examsList[0].id,
          title: examsList[0].title,
          sessionsCount: examsList[0].sessions?.length,
          firstSession: examsList[0].sessions?.[0],
        })
      }

      setExams(examsList)
      console.log('✅ [loadExams] โหลดสำเร็จ')
    } catch (err: any) {
      console.error('❌ [loadExams] Error:', err)
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    } finally {
      if (!isReload) {
        setLoading(false)
      }
    }
  }

  // 8. เริ่มทำข้อสอบ
  const handleStartExam = async (examId: string, sessionId: string) => {
    if (!student) return
    try {
      console.log('🚀 [handleStartExam] เริ่มทำข้อสอบ:', { examId, sessionId })
      const res = await fetch(`/api/student/exams/${examId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: student.id,
          session_id: sessionId,
        }),
      })
      const data = await res.json()
      console.log('📥 [handleStartExam] Response:', data)

      if (!res.ok) {
        alert(data.error || 'ไม่สามารถเริ่มทำข้อสอบได้')
        return
      }

      // ⭐ หา session ที่ตรงกับ sessionId เพื่อดึง end_time
      const selectedSession = exams
        .flatMap((e: any) => e.sessions || [])
        .find((s: any) => s.id === sessionId)

      console.log('🕐 [handleStartExam] Session ที่เลือก:', selectedSession)

      // ⭐ บันทึกข้อมูลลง sessionStorage พร้อม started_at_epoch และ end_time
      sessionStorage.setItem(
        'current_exam',
        JSON.stringify({
          exam_id: examId,
          session_id: sessionId,
          attempt_id: data.attempt_id,
          questions: data.questions,
          started_at: data.started_at,
          started_at_epoch: data.started_at_epoch || Math.floor(new Date(data.started_at).getTime() / 1000), // ⭐ เพิ่ม epoch time พร้อม fallback
          duration_minutes: data.exam.duration_minutes,
          end_time: data.end_time || selectedSession?.end_time || null, // ⭐ เพิ่ม end_time
        })
      )

      console.log('✅ [handleStartExam] บันทึกข้อมูลลง sessionStorage:', {
        exam_id: examId,
        started_at_epoch: data.started_at_epoch,
        end_time: data.end_time || selectedSession?.end_time,
      })

      router.push(`/student/exam/${examId}`)
    } catch (err: any) {
      console.error('❌ [handleStartExam] Error:', err)
      alert('เกิดข้อผิดพลาดในการเริ่มทำข้อสอบ')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('student')
    router.push('/login')
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString + (dateString.includes('Z') || dateString.match(/[+-]\d{2}:\d{2}$/) ? '' : '+07:00'))
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!student || currentTime === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลด...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
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
                    <div key={exam.id} className="bg-white rounded-lg shadow-md border-l-4 border-green-500 overflow-hidden">
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
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{exam.title}</h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 italic">"{exam.description}"</p>
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 รอบสอบที่พร้อมทำ:</h4>
                          <div className="space-y-3">
                            {exam.sessions.map((session: any) => (
                              <div key={session.id} className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-green-200 text-green-800 rounded text-xs font-medium">
                                      {session.time_mode === 'fixed' ? '🕐 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                                    </span>
                                    <span className="font-semibold text-gray-800">{session.title}</span>
                                  </div>
                                  <span className="text-xs text-green-700 font-bold">✅ เปิดอยู่</span>
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
                    <div key={exam.id} className="bg-white rounded-lg shadow-md border-l-4 border-orange-500 overflow-hidden opacity-90">
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
                            <h3 className="text-xl font-bold text-gray-800 mb-2">{exam.title}</h3>
                            {exam.description && (
                              <p className="text-sm text-gray-600 italic">"{exam.description}"</p>
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
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">📅 รอบสอบที่กำหนดไว้:</h4>
                          <div className="space-y-3">
                            {exam.sessions.map((session: any) => (
                              <div key={session.id} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-1 bg-orange-200 text-orange-800 rounded text-xs font-medium">
                                      {session.time_mode === 'fixed' ? '🕐 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                                    </span>
                                    <span className="font-semibold text-gray-800">{session.title}</span>
                                  </div>
                                  <span className="text-xs text-orange-700 font-bold">⏳ ยังไม่เริ่ม</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                                  <div>🕐 เปิด: {formatDateTime(session.start_time)}</div>
                                  <div>🏁 ปิด: {formatDateTime(session.end_time)}</div>
                                </div>
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