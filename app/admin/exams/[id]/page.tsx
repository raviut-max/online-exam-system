import { Suspense } from 'react'
import StudentExamClient from './StudentExamClient'

/**
 * ✅ Page นี้เป็น Server Component
 *    - ทำหน้าที่แค่ห่อ Client Component ด้วย <Suspense>
 *    - ทำให้ Static Shell ถูก Prerender ได้ทันที
 */
export default function StudentExamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">⏳</div>
            <p className="text-gray-500 text-lg animate-pulse">
              กำลังโหลดข้อสอบ...
            </p>
          </div>
        </div>
      }
    >
      <StudentExamClient />
    </Suspense>
  )
}