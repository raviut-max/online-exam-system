'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResultsClient({ examId }: { examId: string }) {
  const [attempts, setAttempts] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [sectionStats, setSectionStats] = useState<any[]>([])
  const [exam, setExam] = useState<any>(null)
  const [selectedSession, setSelectedSession] = useState('')
  const [selectedSection, setSelectedSection] = useState('')
  const [loading, setLoading] = useState(true)
  
  // State สำหรับ Modal ดูรายละเอียด
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string>('')
  const [attemptDetails, setAttemptDetails] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  
  const router = useRouter()

  useEffect(() => {
    loadResults()
  }, [selectedSession, selectedSection])

  const loadResults = async () => {
    setLoading(true)
    console.log('🔍 [ResultsClient] กำลังโหลดผลสอบ, examId:', examId)
    
    try {
      const params = new URLSearchParams()
      if (selectedSession) params.set('session_id', selectedSession)
      if (selectedSection) params.set('section', selectedSection)
      
      const res = await fetch(`/api/admin/exams/${examId}/results?${params.toString()}`)
      const data = await res.json()
      
      console.log('📦 [ResultsClient] API Response:', data)
      
      if (res.ok) {
        setAttempts(data.attempts || [])
        setSessions(data.sessions || [])
        setSectionStats(data.sectionStats || [])
        setExam(data.exam || null)
      } else {
        console.error('❌ [ResultsClient] API Error:', data.error)
      }
    } catch (err) {
      console.error('❌ [ResultsClient] Failed to load results:', err)
    } finally {
      setLoading(false)
    }
  }

  // ฟังก์ชันโหลดรายละเอียดการตอบ
  const loadAttemptDetail = async (attemptId: string) => {
    setLoadingDetail(true)
    setSelectedAttemptId(attemptId)
    setShowDetailModal(true)
    setAttemptDetails(null)
    
    console.log('🔍 [Client] กำลังโหลดรายละเอียด, attemptId:', attemptId)
    console.log('🔍 [Client] examId:', examId)
    
    try {
      const url = `/api/admin/exams/${examId}/attempts/${attemptId}`
      console.log('🔍 [Client] เรียก URL:', url)
      
      const res = await fetch(url)
      const data = await res.json()
      
      console.log('📦 [Client] API Response:', data)
      
      if (res.ok) {
        setAttemptDetails(data)
      } else {
        alert(data.error || 'เกิดข้อผิดพลาด')
      }
    } catch (err) {
      console.error('Failed to load attempt detail:', err)
      alert('เกิดข้อผิดพลาดในการโหลดข้อมูล')
    } finally {
      setLoadingDetail(false)
    }
  }

  // คำนวณสถิติรวมทั้งหมด
  const totalStudents = attempts.length
  const avgPercentage = totalStudents > 0 
    ? attempts.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0) / totalStudents 
    : 0
  const passedCount = attempts.filter(a => a.passed).length
  const failedCount = totalStudents - passedCount
  const passRate = totalStudents > 0 ? (passedCount / totalStudents) * 100 : 0

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

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">📊 ผลการสอบ</h1>
          {exam && (
            <p className="text-sm text-indigo-200 mt-1">
              {exam.title} ({exam.course_code}) | คะแนนผ่าน: {exam.passing_score}%
            </p>
          )}
          <button 
            onClick={() => router.push('/admin/exams')} 
            className="text-sm text-indigo-200 hover:text-white mt-2"
          >
            ← กลับหน้าจัดการข้อสอบ
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-sm text-gray-500">👥 ผู้เข้าสอบ</div>
            <div className="text-3xl font-bold text-blue-700">{totalStudents}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-sm text-gray-500">✅ ผ่าน</div>
            <div className="text-3xl font-bold text-green-700">{passedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="text-sm text-gray-500">❌ ไม่ผ่าน</div>
            <div className="text-3xl font-bold text-red-700">{failedCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
            <div className="text-sm text-gray-500">📈 อัตราผ่าน</div>
            <div className="text-3xl font-bold text-purple-700">{passRate.toFixed(1)}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-sm text-gray-500">🎯 เฉลี่ยทั้งห้อง</div>
            <div className="text-3xl font-bold text-yellow-700">{avgPercentage.toFixed(1)}%</div>
          </div>
        </div>

        {/* สรุปผลแยกตามกลุ่ม */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 สรุปผลแยกตามกลุ่ม (Section)
          </h2>
          
          {sectionStats.length === 0 ? (
            <p className="text-gray-500 text-center py-4">ไม่มีข้อมูลกลุ่ม</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">กลุ่ม</th>
                    <th className="px-4 py-3 text-center">จำนวนผู้เข้าสอบ</th>
                    <th className="px-4 py-3 text-center">คะแนนเฉลี่ย</th>
                    <th className="px-4 py-3 text-center">% เฉลี่ย</th>
                    <th className="px-4 py-3 text-center">คะแนนสูงสุด</th>
                    <th className="px-4 py-3 text-center">คะแนนต่ำสุด</th>
                    <th className="px-4 py-3 text-center">จำนวนผ่าน</th>
                    <th className="px-4 py-3 text-center">อัตราผ่าน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sectionStats.map((stat: any) => (
                    <tr key={stat.section} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-bold text-indigo-700">
                        กลุ่ม {stat.section}
                      </td>
                      <td className="px-4 py-3 text-center">{stat.totalStudents} คน</td>
                      <td className="px-4 py-3 text-center font-semibold">
                        {stat.totalStudents > 0 ? stat.avgScore.toFixed(1) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.totalStudents > 0 ? (
                          <span className={`font-bold ${
                            stat.avgPercentage >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {stat.avgPercentage.toFixed(1)}%
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-green-600 font-semibold">
                        {stat.totalStudents > 0 ? stat.maxScore : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-red-600 font-semibold">
                        {stat.totalStudents > 0 ? stat.minScore : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.passedCount}/{stat.totalStudents}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {stat.totalStudents > 0 ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${
                                  stat.passRate >= 70 ? 'bg-green-500' :
                                  stat.passRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${stat.passRate}%` }}
                              />
                            </div>
                            <span className={`font-bold text-xs ${
                              stat.passRate >= 70 ? 'text-green-600' :
                              stat.passRate >= 50 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {stat.passRate.toFixed(0)}%
                            </span>
                          </div>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">🔍 กรองตามรอบสอบ:</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="">-- ทุกรอบสอบ --</option>
              {sessions.map((s: any) => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">👥 กรองตามกลุ่ม:</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              className="w-full px-4 py-2 border rounded-md"
            >
              <option value="">-- ทุกกลุ่ม --</option>
              {sectionStats.map((stat: any) => (
                <option key={stat.section} value={stat.section}>
                  กลุ่ม {stat.section} ({stat.totalStudents} คน)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ปุ่ม Export Excel */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h3 className="font-bold text-gray-800 mb-3">📥 Export ผลสอบเป็น Excel</h3>
          <div className="flex flex-col md:flex-row gap-3">
            <button
              onClick={() => {
                const params = new URLSearchParams()
                if (selectedSession) params.set('session_id', selectedSession)
                window.open(`/api/admin/exams/${examId}/results/export?${params.toString()}`, '_blank')
              }}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
            >
              📊 Export ภาพรวมทั้งหมด
            </button>
            
            {sectionStats.map((stat: any) => (
              <button
                key={stat.section}
                onClick={() => {
                  const params = new URLSearchParams()
                  if (selectedSession) params.set('session_id', selectedSession)
                  params.set('section', stat.section)
                  window.open(`/api/admin/exams/${examId}/results/export?${params.toString()}`, '_blank')
                }}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-sm transition-all flex items-center justify-center gap-2"
              >
                📥 Export กลุ่ม {stat.section} ({stat.totalStudents} คน)
              </button>
            ))}
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-bold text-gray-800">📋 รายชื่อผู้เข้าสอบ (รายบุคคล)</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-gray-500">⏳ กำลังโหลด...</div>
          ) : attempts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium">ยังไม่มีผู้เข้าสอบตามเงื่อนไขที่เลือก</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">รหัสนักศึกษา</th>
                    <th className="px-4 py-3">ชื่อ-สกุล</th>
                    <th className="px-4 py-3">กลุ่ม</th>
                    <th className="px-4 py-3">รอบสอบ</th>
                    <th className="px-4 py-3 text-center">คะแนน</th>
                    <th className="px-4 py-3 text-center">%</th>
                    <th className="px-4 py-3 text-center">เวลาที่ใช้</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-center">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {attempts.map((a: any, idx: number) => {
                    const session = sessions.find(s => s.id === a.session_id)
                    const percentage = parseFloat(a.percentage) || 0
                    const score = parseFloat(a.score) || 0
                    const totalScore = parseFloat(a.total_score) || 0
                    
                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                        <td className="px-4 py-3 font-mono text-xs">{a.students?.student_code || '-'}</td>
                        <td className="px-4 py-3 font-medium">{a.students?.full_name || '-'}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs font-medium">
                            {a.section || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {session?.title || '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-bold">
                          {score}/{totalScore}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`font-bold ${
                            percentage >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {percentage.toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">{a.time_used || 0} นาที</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            a.passed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {a.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => loadAttemptDetail(a.id)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded text-xs font-medium hover:bg-indigo-700 transition"
                          >
                            👁️ ดูรายละเอียด
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal แสดงรายละเอียดการตอบ (แสดงเฉพาะข้อที่ตอบถูก) */}
      {showDetailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
            {/* Modal Header */}
            <div className="bg-indigo-700 text-white px-6 py-4 rounded-t-lg flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">📋 รายละเอียดการตอบ</h2>
                {attemptDetails?.attempt && (
                  <p className="text-sm text-indigo-200 mt-1">
                    {attemptDetails.attempt.full_name} ({attemptDetails.attempt.student_code}) 
                    | กลุ่ม {attemptDetails.attempt.section}
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setAttemptDetails(null)
                }}
                className="text-white hover:text-gray-200 text-2xl"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {loadingDetail ? (
                <div className="text-center py-8 text-gray-500">⏳ กำลังโหลด...</div>
              ) : attemptDetails ? (
                <>
                  {/* สรุปคะแนน */}
                  <div className="grid grid-cols-4 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600">คะแนน</div>
                      <div className="text-2xl font-bold text-blue-700">
                        {attemptDetails.attempt.score}/{attemptDetails.attempt.total_score}
                      </div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600">เปอร์เซ็นต์</div>
                      <div className="text-2xl font-bold text-purple-700">
                        {parseFloat(attemptDetails.attempt.percentage).toFixed(1)}%
                      </div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-600">เวลาที่ใช้</div>
                      <div className="text-2xl font-bold text-yellow-700">
                        {attemptDetails.attempt.time_used} นาที
                      </div>
                    </div>
                    <div className={`rounded-lg p-3 text-center ${
                      attemptDetails.attempt.passed ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="text-xs text-gray-600">สถานะ</div>
                      <div className={`text-2xl font-bold ${
                        attemptDetails.attempt.passed ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {attemptDetails.attempt.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                      </div>
                    </div>
                  </div>

                  {/* ⭐ รายการข้อสอบ (แสดงเฉพาะข้อที่ตอบถูก) */}
                  <div className="space-y-4">
                    {(() => {
                      const correctQuestions = attemptDetails.results.filter((q: any) => q.is_correct)
                      
                      if (correctQuestions.length === 0) {
                        return (
                          <div className="text-center py-8">
                            <div className="text-5xl mb-3">😔</div>
                            <p className="text-lg font-medium text-gray-700">ไม่มีข้อที่ตอบถูก</p>
                            <p className="text-sm text-gray-500 mt-1">นักศึกษาไม่ผ่านเกณฑ์ในการสอบครั้งนี้</p>
                          </div>
                        )
                      }

                      return correctQuestions.map((q: any) => (
                        <div
                          key={q.question_id}
                          className="border-2 border-green-300 rounded-lg p-4 bg-green-50"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold bg-green-600 text-white">
                              ✓
                            </span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-bold text-gray-600">ข้อ {q.order}</span>
                                {q.topic && (
                                  <span className="text-xs px-2 py-0.5 bg-green-200 text-green-800 rounded font-medium">
                                    {q.topic}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500">({q.points} คะแนน)</span>
                              </div>
                              <p className="text-gray-900 font-medium">{q.question_text}</p>
                            </div>
                          </div>

                          {/* ตัวเลือก */}
                          <div className="ml-11 space-y-2">
                            {q.options.map((opt: any) => {
                              const isCorrectOption = opt.key === q.correct_answer
                              
                              return (
                                <div
                                  key={opt.key}
                                  className={`flex items-center gap-3 p-2 rounded border-2 ${
                                    isCorrectOption
                                      ? 'border-green-500 bg-green-100'
                                      : 'border-gray-200 bg-white opacity-60'
                                  }`}
                                >
                                  <span className="font-bold text-gray-700 w-6">{opt.key}.</span>
                                  <span className="flex-1 text-gray-800">{opt.value}</span>
                                  {isCorrectOption && (
                                    <span className="text-green-600 font-bold text-sm">✓ คำตอบถูก</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          {/* คำอธิบาย */}
                          {q.explanation && (
                            <div className="ml-11 mt-3 p-2 bg-blue-50 rounded text-sm text-blue-800">
                              💡 <strong>คำอธิบาย:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      ))
                    })()}
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">ไม่พบข้อมูล</div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end">
              <button
                onClick={() => {
                  setShowDetailModal(false)
                  setAttemptDetails(null)
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}