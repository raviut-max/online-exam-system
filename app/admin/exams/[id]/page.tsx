import { Suspense } from 'react'
import ExamDetailClient from './ExamDetailClient'

// ⭐ นี่คือ Server Component (ห้ามมี 'use client')
// ทำหน้าที่อ่าน params และห่อ Client Component ด้วย Suspense
export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  return (
    // ⭐ Suspense บอก Next.js ว่าส่วนนี้ Dynamic ให้ Stream แทนการ Prerender
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-xl animate-pulse">⏳ กำลังโหลดข้อมูลข้อสอบ...</p>
      </div>
    }>
      <ExamDetailClient examId={id} />
    </Suspense>
  )
}