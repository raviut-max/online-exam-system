// ⚠️ ห้ามมี 'use client' ในไฟล์นี้เด็ดขาด นี่คือ Server Component

// ⭐ 2 บรรทัดนี้คือหัวใจสำคัญ: บอก Next.js/Vercel ว่า "ห้ามทำ Static Prerender หน้า route ที่มี [id] เด็ดขาด ให้ render ตอนมี request เข้ามาจริง"
export const dynamic = 'force-dynamic'
export const revalidate = 0

import { Suspense } from 'react'
import AdminExamDetailClient from './AdminExamDetailClient'

export default async function AdminExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // ⭐ ใน Next.js 15+ ต้อง await params
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
      {/* ส่ง id ที่ resolve แล้วไปยัง Client Component */}
      <AdminExamDetailClient examId={id} />
    </Suspense>
  )
}