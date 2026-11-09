import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Export ข้อสอบเป็น JSON
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params

    // 1. ดึงข้อมูลข้อสอบ
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, courses(course_code, course_name, section)')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 })
    }

    // 2. ดึงโจทย์ทั้งหมด
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true })

    if (questionsError) throw questionsError

    // 3. สร้าง JSON structure
    const exportData = {
      metadata: {
        course_code: exam.courses?.course_code || '',
        course_name: exam.courses?.course_name || '',
        section: exam.courses?.section || '',
        title: exam.title,
        description: exam.description,
        exam_type: exam.exam_type,
        duration_minutes: exam.duration_minutes,
        passing_score: exam.passing_score,
        shuffle_questions: exam.shuffle_questions,
        shuffle_options: exam.shuffle_options,
        max_attempts: exam.max_attempts,
      },
      questions: (questions || []).map((q: any) => ({
        order: q.order_number,
        type: q.question_type || 'multiple_choice',
        topic: q.topic,
        question: q.question_text,
        options: {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d,
        },
        correct_answer: q.correct_answer,
        points: q.points,
        explanation: q.explanation,
      })),
    }

    return NextResponse.json(exportData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}