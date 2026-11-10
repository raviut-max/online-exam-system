import { Suspense } from 'react'
import AdminExamDetailClient from './AdminExamDetailClient'

// ⭐ บังคับให้ route นี้เป็น dynamic เพื่อป้องกัน Prerender Error
export const dynamic = 'force-dynamic'

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // อ่านค่า id แบบ Async (มาตรฐาน Next.js 15+)
  const { id } = await params

  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <AdminExamDetailClient examId={id} />
    </Suspense>
  )
}