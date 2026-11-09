import { Suspense } from 'react'
import ResultsClient from './ResultsClient'

export default function ResultsPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-lg text-gray-600 animate-pulse">⏳ กำลังโหลดผลสอบ...</div>
      </div>
    }>
      <ResultsWrapper params={params} />
    </Suspense>
  )
}

async function ResultsWrapper({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResultsClient examId={id} />
}