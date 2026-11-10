// app/student/exam/[id]/page.tsx
import { Suspense } from 'react'
import StudentExamClient from './StudentExamClient'

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