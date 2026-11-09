import { Suspense } from 'react'
import ExamClient from './ExamClient'

export default function ExamPage({ params }: { params: Promise<{ sessionId: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg text-gray-600 animate-pulse">⏳ กำลังเตรียมข้อมูลข้อสอบ...</div>
      </div>
    }>
      <ExamWrapper params={params} />
    </Suspense>
  )
}

// Async Server Component ทำหน้าที่แกะค่า params อย่างปลอดภัย
async function ExamWrapper({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <ExamClient sessionId={sessionId} />
}