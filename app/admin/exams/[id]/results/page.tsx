import { Suspense } from 'react'
import ResultsClient from './ResultsClient'

// บังคับให้เป็น Dynamic Route เสมอ
export const instant = false

export default async function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <p className="text-gray-500 text-lg animate-pulse">กำลังโหลดผลการสอบ...</p>
        </div>
      </div>
    }>
      <ResultsClient examId={id} />
    </Suspense>
  )
}