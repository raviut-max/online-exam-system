// app/admin/exams/[id]/page.tsx
import { Suspense } from 'react'
import ExamDetailClient from './ExamDetailClient'
// ⚠️ ปรับ path ให้ตรงกับโปรเจกต์ของคุณ
import { createClient } from '@/lib/supabase/server'

function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="text-4xl mb-4 animate-bounce">⏳</div>
        <p className="text-gray-500 text-lg animate-pulse">
          กำลังโหลดข้อมูลข้อสอบ...
        </p>
      </div>
    </div>
  )
}

async function ExamDetailLoader({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: exam } = await supabase
    .from('exams')
    .select('*, courses(course_name)')
    .eq('id', id)
    .single()

  return <ExamDetailClient exam={exam} />
}

export default function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  return (
    <Suspense fallback={<Loading />}>
      <ExamDetailLoader params={params} />
    </Suspense>
  )
}