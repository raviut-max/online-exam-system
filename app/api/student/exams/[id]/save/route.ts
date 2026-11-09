import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attemptId } = await params // ⭐ เปลี่ยนตรงนี้
    const { question_id, answer } = await request.json()

    if (!question_id || !answer) {
      return NextResponse.json({ error: 'ต้องระบุ question_id และ answer' }, { status: 400 })
    }

    const { data: attempt } = await supabase
      .from('exam_attempts')
      .select('answers')
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      return NextResponse.json({ error: 'ไม่พบการสอบ' }, { status: 404 })
    }

    const currentAnswers = attempt.answers || {}
    currentAnswers[question_id] = answer

    const { error } = await supabase
      .from('exam_attempts')
      .update({ answers: currentAnswers })
      .eq('id', attemptId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Save answer error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}