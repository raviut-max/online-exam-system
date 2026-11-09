'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ImportExamPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAll, setShowAll] = useState(false) // ⭐ เพิ่ม state นี้
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    setError('')
    setSuccess('')
    setPreview(null)
    setShowAll(false) // ⭐ รีเซ็ตตอนโหลดไฟล์ใหม่

    // อ่านและ parse JSON
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string)
        
        // Validate โครงสร้างเบื้องต้น
        if (!json.metadata || !json.questions) {
          setError('ไฟล์ JSON ต้องมี metadata และ questions')
          return
        }

        if (!Array.isArray(json.questions)) {
          setError('questions ต้องเป็น array')
          return
        }

        setPreview(json)
      } catch (err: any) {
        setError(`ไฟล์ JSON ไม่ถูกต้อง: ${err.message}`)
      }
    }
    reader.readAsText(selectedFile)
  }

  const handleImport = async () => {
    if (!preview) {
      setError('ไม่มีข้อมูลที่จะ Import')
      return
    }

    if (!confirm(`ยืนยันการ Import ข้อสอบ "${preview.metadata.title}"?\nจำนวน ${preview.questions.length} ข้อ`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/admin/exams/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(data.message)
        setTimeout(() => {
          router.push('/admin/exams')
        }, 2000)
      } else {
        setError(data.error)
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาด')
    } finally {
      setLoading(false)
    }
  }

  const downloadTemplate = () => {
    const template = {
      metadata: {
        course_code: "CPE3101",
        course_name: "ระบบฐานข้อมูล",
        section: "001",
        title: "สอบปลายภาค (Final Examination)",
        description: "ครอบคลุมทุกบทเรียน",
        exam_type: "final",
        duration_minutes: 180,
        passing_score: 50,
        shuffle_questions: true,
        shuffle_options: true,
        max_attempts: 1
      },
      questions: [
        {
          order: 1,
          type: "multiple_choice",
          topic: "ER Model",
          question: "ข้อใดคือความหมายของ Entity?",
          options: {
            A: "ความสัมพันธ์ระหว่างตาราง",
            B: "วัตถุหรือสิ่งที่มีอยู่จริง",
            C: "คุณสมบัติของตาราง",
            D: "คีย์หลัก"
          },
          correct_answer: "B",
          points: 1,
          explanation: "Entity คือวัตถุที่ระบุได้ชัดเจน"
        }
      ]
    }

    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'exam-template.json'
    a.click()
    URL.revokeObjectURL(url)
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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">📥 Import ข้อสอบจาก JSON</h1>
          <button
            onClick={() => router.push('/admin/exams')}
            className="text-sm text-indigo-200 hover:text-white mt-1"
          >
            ← กลับหน้าจัดการข้อสอบ
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">1. อัปโหลดไฟล์ JSON</h2>
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              📄 ดาวน์โหลด Template
            </button>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
              id="json-upload"
            />
            <label
              htmlFor="json-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-blue-600 font-medium">คลิกเพื่อเลือกไฟล์ JSON</span>
              <span className="text-sm text-gray-500 mt-1">รองรับไฟล์ .json</span>
            </label>
            
            {file && (
              <div className="mt-4 text-sm text-gray-600">
                📄 ไฟล์: {file.name}
              </div>
            )}
          </div>
        </div>

        {/* Preview Section */}
        {preview && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">2. ตัวอย่างข้อสอบ</h2>
              
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 mb-4 border border-indigo-100">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">วิชา:</span>
                    <span className="ml-2 font-bold text-indigo-900">{preview.metadata.course_code} - {preview.metadata.course_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">กลุ่ม:</span>
                    <span className="ml-2 font-bold">{preview.metadata.section}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ชื่อข้อสอบ:</span>
                    <span className="ml-2 font-bold text-indigo-900">{preview.metadata.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">ประเภท:</span>
                    <span className="ml-2 font-bold">{getExamTypeLabel(preview.metadata.exam_type)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">เวลา:</span>
                    <span className="ml-2 font-bold">{preview.metadata.duration_minutes} นาที</span>
                  </div>
                  <div>
                    <span className="text-gray-600">คะแนนผ่าน:</span>
                    <span className="ml-2 font-bold">{preview.metadata.passing_score}%</span>
                  </div>
                  <div>
                    <span className="text-gray-600">จำนวนข้อ:</span>
                    <span className="ml-2 font-bold text-indigo-700">{preview.questions.length} ข้อ</span>
                  </div>
                  <div>
                    <span className="text-gray-600">คะแนนรวม:</span>
                    <span className="ml-2 font-bold text-indigo-700">
                      {preview.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)} คะแนน
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">สุ่มโจทย์:</span>
                    <span className="ml-2 font-bold">{preview.metadata.shuffle_questions ? '✅ ใช่' : '❌ ไม่'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">สุ่มตัวเลือก:</span>
                    <span className="ml-2 font-bold">{preview.metadata.shuffle_options ? '✅ ใช่' : '❌ ไม่'}</span>
                  </div>
                </div>
              </div>

              {/* ⭐ หัวข้อพร้อมปุ่มดูทั้งหมด */}
              <div className="flex justify-between items-center mb-4 mt-6">
                <h3 className="text-md font-semibold text-gray-700">
                  📋 รายการโจทย์ ({preview.questions.length} ข้อ)
                </h3>
                {preview.questions.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-medium transition-colors"
                  >
                    {showAll ? '🔼 แสดงน้อยลง (5 ข้อ)' : '🔽 ดูทั้งหมด'}
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {(showAll ? preview.questions : preview.questions.slice(0, 5)).map((q: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 bg-white hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                      <span className="bg-indigo-600 text-white px-3 py-1 rounded text-sm font-bold shrink-0">
                        ข้อ {q.order || idx + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {q.topic && (
                            <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                              {q.topic}
                            </span>
                          )}
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                            {q.points || 1} คะแนน
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                            {q.type === 'true_false' ? '✓/✗' : 'A/B/C/D'}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 mb-3">{q.question}</p>
                        <div className={`grid gap-2 ${
                          q.type === 'true_false' ? 'grid-cols-2' : 'grid-cols-2'
                        }`}>
                          {Object.entries(q.options || {}).map(([key, value]) => (
                            <div
                              key={key}
                              className={`p-2 rounded border ${
                                key === q.correct_answer
                                  ? 'bg-green-100 border-green-300 text-green-800 font-medium'
                                  : 'bg-gray-50 border-gray-200 text-gray-700'
                              }`}
                            >
                              <span className="font-bold">{key}.</span> {value as string}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-xs text-gray-700">
                            <span className="font-bold">💡 เฉลย:</span> {q.explanation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {!showAll && preview.questions.length > 5 && (
                <div className="mt-4 text-center text-sm text-gray-500 bg-gray-50 rounded-lg py-3">
                  แสดง 5 ข้อแรกจากทั้งหมด {preview.questions.length} ข้อ — กดปุ่ม <strong>"🔽 ดูทั้งหมด"</strong> ด้านบนเพื่อดูทั้งหมด
                </div>
              )}

              {showAll && preview.questions.length > 5 && (
                <div className="mt-4 text-center text-sm text-gray-500 bg-indigo-50 rounded-lg py-2">
                  ✅ แสดงโจทย์ทั้งหมด {preview.questions.length} ข้อ
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-green-300"
              >
                {loading ? '⏳ กำลัง Import...' : '✅ Import ข้อสอบ'}
              </button>
              <button
                onClick={() => {
                  setFile(null)
                  setPreview(null)
                  setShowAll(false)
                  setError('')
                  setSuccess('')
                }}
                className="px-6 py-3 border rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700">
            ✅ {success}
          </div>
        )}
      </main>
    </div>
  )
}