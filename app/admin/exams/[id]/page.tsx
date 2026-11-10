import { Suspense } from 'react'
import AdminExamDetailClient from './AdminExamDetailClient'

// ⚠️ ห้ามมี export const dynamic หรือ revalidate เด็ดขาด เพราะขัดแย้งกับ Vercel cacheComponents

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ Next.js 15+ มาตรฐาน: การ await params ทำให้ส่วนนี้เป็น dynamic โดยอัตโนมัติ
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลดข้อมูลข้อสอบ...</p>
        </div>
      </div>
    }>
      <AdminExamDetailClient examId={id} />
    </Suspense>
  )
}