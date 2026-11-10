import { Suspense } from 'react'
import AdminExamDetailClient from './AdminExamDetailClient'

/**
 * Server Component
 * - ห่อ Client Component ด้วย <Suspense>
 * - รับ params.id แล้วส่งต่อให้ Client Component
 */
export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

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
      <AdminExamDetailClient examId={id} />
    </Suspense>
  )
}