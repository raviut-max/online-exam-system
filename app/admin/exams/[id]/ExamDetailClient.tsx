'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function ExamDetailClient({ exam }: { exam: any }) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">ไม่พบข้อมูลข้อสอบ</p>
      </div>
    )
  }

  const handleDelete = async () => {
    if (!confirm(`คุณแน่ใจหรือไม่ที่จะลบข้อสอบ "${exam.title}"? การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return
    }

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('ลบข้อสอบไม่สำเร็จ')
      
      alert('ลบข้อสอบเรียบร้อยแล้ว')
      router.push('/admin/exams')
      router.refresh()
    } catch (err: any) {
      alert(err.message || 'เกิดข้อผิดพลาด')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                exam.exam_type === 'quiz' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {exam.exam_type === 'quiz' ? '📝 ควิซ' : '📋 สอบ'}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                exam.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {exam.is_active ? '✅ เปิดใช้งาน' : '⏸️ ปิดใช้งาน'}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">{exam.title}</h1>
            <p className="text-gray-600 mt-1">
              {exam.course_code} - {exam.courses?.course_name || 'ไม่ระบุวิชา'}
            </p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            {/* ⭐ ปุ่มดูผลสอบที่ลิงก์ไปยัง /admin/exams/[id]/results */}
            <Link href={`/admin/exams/${exam.id}/results`}>
              <button className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition shadow-sm flex items-center justify-center gap-2">
                📊 ดูผลสอบ
              </button>
            </Link>
            
            <Link href={`/admin/exams/import?examId=${exam.id}`}>
              <button className="w-full md:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm flex items-center justify-center gap-2">
                ✏️ แก้ไข/นำเข้าใหม่
              </button>
            </Link>

            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full md:w-auto px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 font-medium transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isDeleting ? 'กำลังลบ...' : '🗑️ ลบข้อสอบ'}
            </button>
            
            <Link href="/admin/exams">
              <button className="w-full md:w-auto px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition shadow-sm">
                ← กลับรายการ
              </button>
            </Link>
          </div>
        </div>

        {/* Info Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">ระยะเวลาทำข้อสอบ</div>
            <div className="text-2xl font-bold text-gray-900">{exam.duration_minutes} นาที</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">คะแนนผ่านเกณฑ์</div>
            <div className="text-2xl font-bold text-blue-600">{exam.passing_score}%</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">จำนวนครั้งที่ทำได้</div>
            <div className="text-2xl font-bold text-purple-600">{exam.max_attempts} ครั้ง</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">การสุ่มโจทย์/ตัวเลือก</div>
            <div className="text-sm font-semibold text-gray-900 mt-1">
              โจทย์: {exam.shuffle_questions ? '✅ ใช่' : '❌ ไม่'}<br/>
              ตัวเลือก: {exam.shuffle_options ? '✅ ใช่' : '❌ ไม่'}
            </div>
          </div>
        </div>

        {/* Description & Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">📝 รายละเอียดและคำอธิบาย</h3>
            <p className="text-gray-600 whitespace-pre-wrap leading-relaxed">
              {exam.description || 'ไม่มีคำอธิบายเพิ่มเติม'}
            </p>
          </div>
          
          <div className="p-6 bg-gray-50/50">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">⚙️ การตั้งค่าระบบ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div>
                <span className="text-gray-500 block mb-1">รหัสวิชา:</span>
                <span className="font-mono font-medium text-gray-900">{exam.course_code}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">ประเภทข้อสอบ:</span>
                <span className="font-medium text-gray-900 capitalize">{exam.exam_type}</span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">สร้างเมื่อ:</span>
                <span className="font-medium text-gray-900">
                  {exam.created_at ? new Date(exam.created_at).toLocaleString('th-TH') : '-'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block mb-1">สถานะ:</span>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  exam.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {exam.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}