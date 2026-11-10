import { Suspense } from 'react'
import AdminExamDetailClient from './AdminExamDetailClient'

// ⚠️ ห้ามมี export const dynamic หรือ revalidate เด็ดขาด เพราะขัดแย้งกับ Vercel cacheComponents

/**
 * ✅ Component ย่อยที่ทำหน้าที่ await params
 *    - ถูกห่อด้วย <Suspense> ที่ Page หลัก
 *    - ทำให้ Static Shell ของหน้าถูก Prerender ได้ทันที
 *    - ส่วนที่ต้องใช้ params จะถูก Stream เข้ามาทีหลัง
 */
async function ExamDetailLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AdminExamDetailClient examId={id} />
}

export default function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">⏳</div>
            <p className="text-gray-500 text-lg animate-pulse">
              กำลังโหลดข้อมูลข้อสอบ...
            </p>
          </div>
        </div>
      }
    >
      <ExamDetailLoader params={params} />
    </Suspense>
  )
}