import { Suspense } from 'react'
import ExamDetailClient from './ExamDetailClient'

// ⭐ วิธีใหม่ใน Next.js 15/16 เมื่อ cacheComponents เปิดอยู่
// ใช้ instant = false เพื่อบอกว่าหน้านี้ต้องรอข้อมูลจริง (Blocking Route)
export const instant = false

export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // รอค่า params จาก URL
  const { id } = await params

  return (
    // ⭐ ห่อ Client Component ด้วย Suspense เพื่อให้ Next.js Stream ข้อมูลได้
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลดข้อมูลข้อสอบ...</p>
        </div>
      </div>
    }>
      <ExamDetailClient examId={id} />
    </Suspense>
  )
}