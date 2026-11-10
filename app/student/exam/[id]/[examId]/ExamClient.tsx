'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function ExamClient({ examId }: { examId: string }) {
  const router = useRouter()

  const [examData, setExamData] = useState<any>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set())
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const QUESTIONS_PER_PAGE = 10

  useEffect(() => {
    const stored = sessionStorage.getItem('current_exam')
    if (!stored) {
      alert('ไม่พบข้อมูลข้อสอบ กรุณากลับไปที่ Dashboard')
      router.push('/dashboard')
      return
    }

    const data = JSON.parse(stored)
    if (data.exam_id !== examId) {
      alert('ข้อมูลข้อสอบไม่ตรงกัน')
      router.push('/dashboard')
      return
    }

    setExamData(data)
    setTimeLeft(data.duration_minutes * 60)

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current)
          handleSubmit(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [examId, router])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const toggleFlag = (index: number) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const goToQuestion = (index: number) => {
    const page = Math.floor(index / QUESTIONS_PER_PAGE)
    setCurrentPage(page)
    setTimeout(() => {
      const element = document.getElementById(`question-${index}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }, 100)
  }

  const handleSubmit = async (autoSubmit = false) => {
    if (isSubmitting) return
    setIsSubmitting(true)

    if (timerRef.current) clearInterval(timerRef.current)

    try {
      const res = await fetch(`/api/student/exams/${examId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attempt_id: examData.attempt_id,
          answers: answers,
          time_used: examData.duration_minutes * 60 - timeLeft,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'ไม่สามารถส่งข้อสอบได้')
      }

      sessionStorage.removeItem('current_exam')
      
      alert('✅ ส่งข้อสอบเรียบร้อยแล้ว!\nระบบได้รับคำตอบของคุณแล้ว โปรดรอประกาศผลจากอาจารย์')
      router.push('/dashboard')
    } catch (err: any) {
      console.error('❌ Submit Error:', err)
      setIsSubmitting(false)
      if (!autoSubmit) {
        alert(err.message || 'เกิดข้อผิดพลาดในการส่งข้อสอบ')
      }
    }
  }

  // ฟังก์ชันดึงตัวเลือกที่มีอยู่จริง (A-F)
  const getOptions = (q: any) => {
    const opts = []
    if (q.option_a) opts.push({ key: 'A', text: q.option_a })
    if (q.option_b) opts.push({ key: 'B', text: q.option_b })
    if (q.option_c) opts.push({ key: 'C', text: q.option_c })
    if (q.option_d) opts.push({ key: 'D', text: q.option_d })
    if (q.option_e) opts.push({ key: 'E', text: q.option_e })
    if (q.option_f) opts.push({ key: 'F', text: q.option_f })
    return opts
  }

  if (!examData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">กำลังโหลดข้อสอบ...</p>
      </div>
    )
  }

  const questions = examData.questions || []
  const totalPages = Math.ceil(questions.length / QUESTIONS_PER_PAGE)
  const startIndex = currentPage * QUESTIONS_PER_PAGE
  const endIndex = Math.min(startIndex + QUESTIONS_PER_PAGE, questions.length)
  const currentQuestions = questions.slice(startIndex, endIndex)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold">{examData.exam?.title || 'ข้อสอบ'}</h1>
            <p className="text-xs text-blue-100">
              หน้า {currentPage + 1} จาก {totalPages} | ข้อที่ {startIndex + 1}-{endIndex} จาก {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`text-2xl font-bold font-mono ${timeLeft < 300 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
            <button
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition disabled:bg-gray-400"
            >
              {isSubmitting ? 'กำลังส่ง...' : '📤 ส่งข้อสอบ'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* ส่วนแสดงโจทย์ (ทีละ 10 ข้อ) */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {currentQuestions.map((q: any, idx: number) => {
                const globalIndex = startIndex + idx
                const isAnswered = answers[q.id]
                const isFlagged = flaggedQuestions.has(globalIndex)

                return (
                  <div
                    key={q.id}
                    id={`question-${globalIndex}`}
                    className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                      isAnswered ? 'border-green-500' : 'border-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          ข้อที่ {globalIndex + 1}
                        </span>
                        {isFlagged && (
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                            🚩 ทำเครื่องหมาย
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => toggleFlag(globalIndex)}
                        className="text-gray-400 hover:text-yellow-500 transition"
                      >
                        {isFlagged ? '🚩' : '🏳️'}
                      </button>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 mb-6 whitespace-pre-wrap">
                      {q.question_text || q.text}
                    </h3>

                    {q.image_url && (
                      <div className="mb-4">
                        <img src={q.image_url} alt="โจทย์" className="max-w-full rounded-lg" />
                      </div>
                    )}

                    {/* ตัวเลือก A-F */}
                    <div className="space-y-3">
                      {getOptions(q).map((opt) => (
                        <label
                          key={opt.key}
                          className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition ${
                            answers[q.id] === opt.key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={opt.key}
                            checked={answers[q.id] === opt.key}
                            onChange={() => setAnswers((prev: any) => ({ ...prev, [q.id]: opt.key }))}
                            className="mr-3 w-4 h-4"
                          />
                          <span className="text-gray-700">
                            <strong className="text-blue-600 mr-2">{opt.key}.</strong> {opt.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ปุ่มเลื่อนหน้า */}
            <div className="flex justify-between mt-8 pt-4 border-t">
              <button
                onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← หน้าก่อนหน้า
              </button>
              <span className="px-4 py-2 text-gray-600">
                หน้า {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage === totalPages - 1}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                หน้าถัดไป →
              </button>
            </div>
          </div>

          {/* ส่วนแสดงรายการข้อ */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-24">
              <h4 className="font-bold text-gray-800 mb-3">📋 รายการข้อสอบ</h4>
              <div className="grid grid-cols-5 gap-2 max-h-96 overflow-y-auto">
                {questions.map((q: any, index: number) => {
                  const isAnswered = answers[q.id]
                  const isFlagged = flaggedQuestions.has(index)
                  const isCurrentPage = Math.floor(index / QUESTIONS_PER_PAGE) === currentPage

                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(index)}
                      className={`w-10 h-10 rounded-lg font-medium text-sm transition ${
                        isAnswered
                          ? 'bg-green-500 text-white'
                          : isFlagged
                          ? 'bg-yellow-400 text-white'
                          : isCurrentPage
                          ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      {index + 1}
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>ตอบแล้ว ({Object.keys(answers).length})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>ทำเครื่องหมาย ({flaggedQuestions.size})</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span>ยังไม่ตอบ ({questions.length - Object.keys(answers).length})</span>
                </div>
              </div>

              <button
                onClick={() => setShowConfirmSubmit(true)}
                disabled={isSubmitting}
                className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:bg-gray-400"
              >
                {isSubmitting ? 'กำลังส่ง...' : '📤 ส่งข้อสอบ'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Modal ยืนยันการส่ง */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4">📤 ยืนยันการส่งข้อสอบ</h3>
            <div className="mb-4">
              <p className="text-gray-700 mb-2">
                คุณตอบแล้ว <strong className="text-green-600">{Object.keys(answers).length}</strong> ข้อ
                จากทั้งหมด <strong>{questions.length}</strong> ข้อ
              </p>
              {Object.keys(answers).length < questions.length && (
                <p className="text-red-600 text-sm">
                  ⚠️ คุณยังไม่ได้ตอบ {questions.length - Object.keys(answers).length} ข้อ
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSubmit(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition disabled:bg-gray-400"
              >
                {isSubmitting ? 'กำลังส่ง...' : '✅ ยืนยันส่ง'}
              </button>
              <button
                onClick={() => setShowConfirmSubmit(false)}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium transition disabled:opacity-50"
              >
                ❌ ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}