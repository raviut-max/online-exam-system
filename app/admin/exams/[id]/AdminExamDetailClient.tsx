'use client' // ⚠️ ต้องมีบรรทัดนี้เท่านั้น

import { useRouter } from 'next/navigation'

export default function AdminExamDetailClient({ examId }: { examId: string }) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold mb-4">📝 จัดการโจทย์ข้อสอบ</h1>
        <p className="text-gray-600 mb-6">
          รหัสข้อสอบ (Exam ID): <span className="font-mono bg-gray-100 px-2 py-1 rounded">{examId}</span>
        </p>
        
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/admin/exams')}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition"
          >
            ← กลับหน้าจัดการข้อสอบ
          </button>
          <button
            onClick={() => alert('ฟีเจอร์เพิ่มโจทย์กำลังพัฒนาในขั้นตอนถัดไป')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
          >
            + เพิ่มโจทย์ใหม่
          </button>
        </div>
      </div>
    </div>
  )
}