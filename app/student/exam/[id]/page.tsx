// app/student/exam/[id]/page.tsx
import { Suspense } from 'react'
import StudentExamClient from './StudentExamClient'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">⏳</div>
        <p className="text-gray-500 text-lg animate-pulse">
          กำลังโหลดข้อสอบ...
        </p>
      </div>
    </div>
  )
}

// อยู่ใต้ <Suspense> จึง await params ได้
async function ExamLoader({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <StudentExamClient examId={id} />
}

export default function StudentExamPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ExamLoader params={params} />
    </Suspense>
  )
}