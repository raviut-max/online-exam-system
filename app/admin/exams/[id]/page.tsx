import ExamDetailClient from './ExamDetailClient'

// นี่คือ Server Component (ไม่มี 'use client')
// ทำหน้าที่อ่าน params จาก URL แล้วส่งต่อไปยัง Client Component
export default async function ExamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ExamDetailClient examId={id} />
}