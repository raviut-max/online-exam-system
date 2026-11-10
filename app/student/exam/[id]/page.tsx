import { Suspense } from 'react'
import ExamClient from './ExamClient'

// ⭐ แก้ Build Error: บอก Next.js ว่าหน้านี้ต้อง render แบบ dynamic (ไม่ prerender)
export const instant = false

export default async function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  // ⭐ อ่านค่า id จาก Dynamic Route [id]
  const { id } = await params

  return (
    // ⭐ ห่อ Client Component ด้วย Suspense เพื่อให้ Next.js Stream ได้
    // และป้องกัน Hydration Mismatch จากเวลาหรือข้อมูล runtime
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลดข้อสอบ...</p>
        </div>
      </div>
    }>
      {/* ส่ง examId ไปยัง Client Component */}
      <ExamClient examId={id} />
    </Suspense>
  )
}