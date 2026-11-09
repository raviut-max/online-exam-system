'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

const QUESTIONS_PER_PAGE = 10

export default function ExamClient({ sessionId }: { sessionId: string }) {
  const router = useRouter()

  const [attemptId, setAttemptId] = useState<string>('')
  const [examData, setExamData] = useState<any>(null)
  const [questions, setQuestions] = useState<any[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [currentPage, setCurrentPage] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const hasWarned1Min = useRef(false)
  const hasWarned10Sec = useRef(false)

  // 1. โหลดข้อมูลจาก sessionStorage เมื่อเข้าหน้า
  useEffect(() => {
    const savedAttemptId = sessionStorage.getItem('current_attempt_id')
    const savedExamData = sessionStorage.getItem('current_exam_data')
    const savedAnswers = sessionStorage.getItem('exam_answers')

    if (!savedAttemptId || !savedExamData) {
      alert('ไม่พบข้อมูลการสอบ กรุณาเริ่มสอบจากหน้า Dashboard')
      router.push('/dashboard')
      return
    }

    // ตรวจสอบว่า savedAnswers ตรงกับ attemptId ปัจจุบันไหม
    // ถ้ามี _results อยู่ = เป็นคำตอบที่ส่งแล้วจากครั้งก่อน → ล้างทิ้ง!
    if (savedAnswers) {
      try {
        const parsedAnswers = JSON.parse(savedAnswers)
        if (parsedAnswers._results) {
          sessionStorage.removeItem('exam_answers')
          setAnswers({})
        } else {
          setAnswers(parsedAnswers)
        }
      } catch (err) {
        console.error('❌ [Client] parse answers error:', err)
        sessionStorage.removeItem('exam_answers')
        setAnswers({})
      }
    } else {
      setAnswers({})
    }

    setAttemptId(savedAttemptId)
    const parsedExamData = JSON.parse(savedExamData)
    setExamData(parsedExamData.exam)
    setQuestions(parsedExamData.questions)
    setTimeLeft(parsedExamData.exam.duration_minutes * 60)
  }, [router])

  // 2. บันทึกคำตอบลง sessionStorage ทุกครั้งที่เปลี่ยน
  useEffect(() => {
    if (Object.keys(answers).length > 0) {
      sessionStorage.setItem('exam_answers', JSON.stringify(answers))
    }
  }, [answers])

  // 3. ระบบจับเวลาถอยหลัง + แจ้งเตือน + บังคับส่งอัตโนมัติ
  useEffect(() => {
    if (timeLeft <= 0 || isSubmitting) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === 60 && !hasWarned1Min.current) {
          hasWarned1Min.current = true
          alert('⚠️ เวลาทำข้อสอบเหลืออีก 1 นาที! กรุณาส่งข้อสอบโดยเร็ว')
        }
        
        if (prev === 10 && !hasWarned10Sec.current) {
          hasWarned10Sec.current = true
          alert('🚨 เวลาทำข้อสอบเหลืออีก 10 วินาที! ระบบจะส่งข้อสอบอัตโนมัติ')
        }

        if (prev <= 1) {
          clearInterval(timer)
          setTimeout(() => {
            handleAutoSubmit()
          }, 100)
          return 0
        }
        
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isSubmitting])

  // 4. แจ้งเตือนหากพยายามปิดแท็บหรือออกจากหน้า
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'คุณกำลังจะออกจากหน้าทำข้อสอบ ข้อมูลที่เลือกไว้จะยังถูกบันทึก แต่เวลาจะเดินต่อไป'
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  const saveAnswerToDb = async (questionId: string, answer: string) => {
    try {
      await fetch(`/api/student/exams/${attemptId}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question_id: questionId, answer }),
      })
    } catch (err) {
      console.error('Failed to auto-save', err)
    }
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    const newAnswers = { ...answers, [questionId]: answer }
    setAnswers(newAnswers)
    saveAnswerToDb(questionId, answer)
  }

  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  const currentQuestions = questions.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  )
  const answeredCount = Object.keys(answers).length

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleAutoSubmit = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    alert('⏰ หมดเวลาทำข้อสอบ!\nระบบกำลังส่งข้อสอบของคุณอัตโนมัติ...')
    await submitExam()
  }

  const handleSubmit = async () => {
    const unanswered = questions.length - answeredCount
    let confirmMsg = 'คุณต้องการส่งข้อสอบใช่หรือไม่?'
    if (unanswered > 0) {
      confirmMsg = `คุณยังไม่ได้ตอบ ${unanswered} ข้อ\nคุณต้องการส่งข้อสอบใช่หรือไม่?`
    }
    
    if (!confirm(confirmMsg)) return

    setIsSubmitting(true)
    await submitExam()
  }

  const submitExam = async () => {
    if (!attemptId) {
      alert('❌ ข้อผิดพลาด: ไม่พบรหัสการสอบ (attemptId) กรุณารีเฟรชและเริ่มสอบใหม่')
      setIsSubmitting(false)
      return
    }

    try {
      const res = await fetch(`/api/student/exams/${attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()

      if (res.ok) {
        // ล้าง sessionStorage ทั้งหมดหลังส่งสำเร็จ
        sessionStorage.removeItem('current_attempt_id')
        sessionStorage.removeItem('current_exam_data')
        sessionStorage.removeItem('exam_answers')
        
        // ⭐ แก้ไขข้อความแจ้งเตือน: บอกแค่ส่งเรียบร้อยแล้ว (ไม่บอกคะแนน/ไม่บอกผ่าน)
        alert('✅ ส่งข้อสอบเรียบร้อยแล้ว')
        
        router.push('/dashboard')
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการส่งข้อสอบ')
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error('❌ [Client] Fetch Error:', err)
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ')
      setIsSubmitting(false)
    }
  }

  if (!examData || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">⏳ กำลังโหลดข้อมูลข้อสอบ...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header ติดด้านบน */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-800">{examData.title}</h1>
            <p className="text-xs text-gray-500">หน้า {currentPage + 1} จาก {totalPages}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-500">ตอบแล้ว</div>
              <div className="text-sm font-bold text-blue-600">{answeredCount} / {questions.length} ข้อ</div>
            </div>
            <div className={`px-4 py-2 rounded-lg font-mono text-xl font-bold border-2 ${
              timeLeft < 60 
                ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' 
                : timeLeft < 300 
                  ? 'bg-orange-50 text-orange-600 border-orange-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 h-1.5">
          <div 
            className="bg-blue-600 h-1.5 transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <div className="space-y-6">
          {currentQuestions.map((q, index) => {
            const globalIndex = currentPage * QUESTIONS_PER_PAGE + index + 1
            const isAnswered = !!answers[q.id]

            return (
              <div key={q.id} className={`bg-white rounded-xl shadow-sm border p-6 transition-all ${
                isAnswered ? 'border-blue-200' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                    isAnswered ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {globalIndex}
                  </span>
                  <div className="flex-1">
                    <p className="text-lg font-medium text-gray-900 leading-relaxed">{q.question_text}</p>
                    {q.topic && (
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {q.topic}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-3 ml-11">
                  {q.options.map((opt: any) => (
                    <label
                      key={opt.key}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[q.id] === opt.key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={opt.key}
                        checked={answers[q.id] === opt.key}
                        onChange={() => handleAnswerChange(q.id, opt.key)}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-semibold text-gray-700 w-6">{opt.key}.</span>
                      <span className="text-gray-800">{opt.value}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
            disabled={currentPage === 0}
            className="px-6 py-2.5 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            ⬅️ ย้อนกลับ
          </button>

          <div className="flex gap-3">
            {currentPage < totalPages - 1 ? (
              <button
                onClick={() => setCurrentPage((prev) => Math.min(totalPages - 1, prev + 1))}
                className="px-6 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2"
              >
                ถัดไป ➡️
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-8 py-2.5 rounded-lg font-bold bg-green-600 text-white hover:bg-green-700 shadow-md flex items-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? '⏳ กำลังส่ง...' : '✅ ส่งข้อสอบ'}
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  )
}