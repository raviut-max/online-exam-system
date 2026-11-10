'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminResultsPage() {
  const [admin, setAdmin] = useState<any>(null)
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const storedAdmin = localStorage.getItem('admin')
    if (!storedAdmin) {
      router.push('/admin-login')
      return
    }
    setAdmin(JSON.parse(storedAdmin))
    loadExams()
  }, [router])

  const loadExams = async () => {
    try {
      const res = await fetch('/api/admin/exams')
      const data = await res.json()
      if (res.ok) {
        setExams(data.exams || [])
      }
    } catch (err) {
      console.error('Failed to load exams', err)
    } finally {
      setLoading(false)
    }
  }

  if (!admin || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600 animate-pulse">กำลังโหลดข้อมูล...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-emerald-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">📊 รายงานผลคะแนนการสอบ</h1>
            <p className="text-sm text-emerald-200">เลือกวิชาที่ต้องการดูผลสรุปและรายชื่อผู้เข้าสอบ</p>
          </div>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 text-sm font-medium text-emerald-700 bg-white rounded-md hover:bg-emerald-50 transition"
          >
            ← กลับหน้าหลัก
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {exams.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">ยังไม่มีข้อมูลข้อสอบในระบบ</h3>
            <p className="text-gray-500">กรุณาสร้างข้อสอบหรือรอบสอบก่อนเพื่อดูผลคะแนน</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map((exam: any) => (
              <div key={exam.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-100 border-l-4 border-l-emerald-500">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${
                      exam.exam_type === 'quiz' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {exam.exam_type === 'quiz' ? '📝 ควิซ' : '📋 สอบ'}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 leading-tight">{exam.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{exam.course_code} - {exam.courses?.course_name || 'ไม่ระบุวิชา'}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <Link href={`/admin/exams/${exam.id}/results`} className="block">
                    <button className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition flex items-center justify-center gap-2 shadow-sm">
                      📊 ดูผลคะแนนรายวิชา
                    </button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}