'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentDashboard() {
  const [student, setStudent] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRemaining, setTimeRemaining] = useState<Record<string, number>>({})
  const router = useRouter()
  const routerRef = useRef(router) // ⭐ ใช้ useRef เก็บ router

  // อัพเดท ref เมื่อ router เปลี่ยน
  useEffect(() => {
    routerRef.current = router
  }, [router])

  useEffect(() => {
    const storedStudent = localStorage.getItem('student')
    
    let studentData: any
    if (!storedStudent) {
      studentData = { 
        id: '02b917bb-b0ec-4c72-84c5-40d4b91e0f44', // ⭐ เปลี่ยนเป็น UUID จริง
        full_name: 'นักศึกษา ทดสอบ' 
      }
    } else {
      studentData = JSON.parse(storedStudent)
    }
    
    setStudent(studentData)
    loadExams(studentData.id)
  }, []) // ⭐ ใช้ [] คงที่ ไม่มี dependency เปลี่ยน

  const loadExams = async (studentId: string) => {
    setLoading(true)
    console.log('🔍 Loading exams for student:', studentId)
    
    try {
      const res = await fetch(`/api/student/exams?student_id=${studentId}`)
      const data = await res.json()
      console.log('📦 API Response:', data)
      
      if (res.ok) {
        setExams(data.exams || [])
        console.log('✅ Exams loaded:', data.exams?.length || 0)
      } else {
        console.error('❌ API Error:', data.error)
      }
    } catch (err) {
      console.error('❌ Failed to load exams:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime()
      const newTimeRemaining: Record<string, number> = {}
      
      exams.forEach((exam: any) => {
        exam.exam_sessions?.forEach((session: any) => {
          if (session.time_mode === 'fixed' && session.end_time) {
            const endTime = new Date(session.end_time).getTime()
            const diff = endTime - now
            newTimeRemaining[session.id] = Math.max(0, diff)
          }
        })
      })
      
      setTimeRemaining(newTimeRemaining)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [exams])

  const handleStartExam = async (sessionId: string) => {
    if (!confirm('คุณต้องการเริ่มทำข้อสอบใช่หรือไม่?\n⚠️ เวลาจะเริ่มนับถอยหลังทันทีเมื่อกดตกลง')) return
    
    try {
      const res = await fetch(`/api/student/exams/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: student.id }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        sessionStorage.setItem('current_attempt_id', data.attempt_id)
        sessionStorage.setItem('current_exam_data', JSON.stringify(data))
        routerRef.current.push(`/exam/${sessionId}`) // ⭐ ใช้ routerRef
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการเริ่มทำข้อสอบ')
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
    }
  }

  const formatTimeRemaining = (milliseconds: number) => {
    if (milliseconds <= 0) return 'หมดเวลา'
    
    const totalSeconds = Math.floor(milliseconds / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">⏳ กำลังโหลดข้อมูลข้อสอบ...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">🎓 ระบบสอบออนไลน์</h1>
            <p className="text-sm text-blue-100">Dashboard นักศึกษา</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">สวัสดี, {student?.full_name || 'นักศึกษา'}</span>
            <button
              onClick={() => {
                localStorage.removeItem('student')
                routerRef.current.push('/login')
              }}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-white rounded-md hover:bg-blue-50 transition"
            >
              ออกจากระบบ
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">📝 รายการข้อสอบที่เปิดให้ทำ</h2>

        {exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
            <div className="text-5xl mb-4">📭</div>
            <p className="text-lg font-medium">ยังไม่มีข้อสอบที่เปิดให้ทำในขณะนี้</p>
            <p className="text-sm text-gray-400 mt-2">กรุณาตรวจสอบอีกครั้งในภายหลัง หรือติดต่อผู้สอน</p>
          </div>
        ) : (
          <div className="space-y-6">
            {exams.map((exam: any) => (
              <div key={exam.id} className="bg-white rounded-xl shadow-md overflow-hidden border-l-4 border-blue-500">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-700 rounded">
                          {exam.exam_type === 'midterm' ? '📗 กลางภาค' : exam.exam_type === 'final' ? '📕 ปลายภาค' : '📝 ควิซ/ฝึกหัด'}
                        </span>
                        <span className="text-sm text-gray-600 font-medium">
                          {exam.courses?.course_code} - {exam.courses?.course_name}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-sm text-gray-600 mt-1 italic">"{exam.description}"</p>
                      )}
                    </div>
                    <div className="text-right md:text-left bg-gray-50 px-4 py-2 rounded-lg">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">ระยะเวลาทำ</div>
                      <div className="text-2xl font-bold text-gray-800">{exam.duration_minutes} <span className="text-sm font-normal text-gray-600">นาที</span></div>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">🗓️ รอบสอบที่พร้อมทำ:</h4>
                    {exam.exam_sessions.map((session: any) => {
                      const remaining = timeRemaining[session.id] || 0
                      const isExpired = remaining <= 0
                      
                      return (
                        <div key={session.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                                session.time_mode === 'fixed' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {session.time_mode === 'fixed' ? '📅 ระบุเวลา' : '🔄 ยืดหยุ่น'}
                              </span>
                              <span className="text-sm font-bold text-gray-800">{session.title}</span>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {session.time_mode === 'fixed' ? (
                                <>
                                  🕒 เปิด: {new Date(session.start_time).toLocaleString('th-TH')} <br/>
                                  🏁 ปิด: {new Date(session.end_time).toLocaleString('th-TH')}
                                </>
                              ) : (
                                <>
                                  📅 ช่วงเวลา: {new Date(session.start_time).toLocaleDateString('th-TH')} - {new Date(session.end_time).toLocaleDateString('th-TH')}
                                  <span className="text-xs text-gray-500 ml-2 block mt-1">(สามารถเลือกเริ่มทำเวลาไหนก็ได้ภายในช่วงนี้)</span>
                                </>
                              )}
                            </div>
                            
                            {session.time_mode === 'fixed' && (
                              <div className={`mt-2 text-lg font-bold flex items-center gap-2 ${
                                isExpired 
                                  ? 'text-gray-500' 
                                  : remaining < 300000
                                    ? 'text-red-600 animate-pulse'
                                    : 'text-blue-600'
                              }`}>
                                <span className="text-2xl">{isExpired ? '⏹️' : '⏳'}</span>
                                <span>
                                  {isExpired 
                                    ? 'หมดเวลาแล้ว' 
                                    : `เวลาเหลือ: ${formatTimeRemaining(remaining)}`
                                  }
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 md:border-l md:pl-4 md:border-gray-200">
                            <div className="text-right">
                              <div className="text-xs text-gray-500">ทำได้เหลือ</div>
                              <div className="text-lg font-bold text-gray-800">
                                {session.max_attempts_override || exam.max_attempts} <span className="text-sm font-normal">ครั้ง</span>
                              </div>
                            </div>
                            
                            <button
                              onClick={() => handleStartExam(session.id)}
                              disabled={isExpired}
                              className={`px-6 py-3 rounded-lg font-semibold shadow-sm transition-all flex items-center gap-2 ${
                                isExpired
                                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                  : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md active:scale-95'
                              }`}
                            >
                              <span>{isExpired ? '⏹️' : '▶️'}</span>
                              {isExpired ? 'หมดเวลา' : 'เริ่มทำข้อสอบ'}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}