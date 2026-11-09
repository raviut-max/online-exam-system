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
    const { id: sessionId } = await params
    const { student_id } = await request.json()

    if (!student_id) {
      return NextResponse.json({ error: 'ต้องระบุ student_id' }, { status: 400 })
    }

    // 1. ดึงข้อมูล session + exam
    const { data: session } = await supabase
      .from('exam_sessions')
      .select(`
        *,
        exams(
          id,
          course_code,
          title,
          duration_minutes,
          passing_score,
          max_attempts,
          shuffle_questions,
          shuffle_options
        )
      `)
      .eq('id', sessionId)
      .single()

    if (!session) {
      return NextResponse.json({ error: 'ไม่พบรอบสอบ' }, { status: 404 })
    }

    // 2. ตรวจสอบเวลา
    const now = new Date()
    const startTime = new Date(session.start_time)
    const endTime = new Date(session.end_time)

    if (now < startTime || now > endTime) {
      return NextResponse.json({ error: 'ไม่อยู่ในช่วงเวลาสอบ' }, { status: 403 })
    }

    // 3. ตรวจสอบจำนวนครั้ง
    const maxAttempts = session.max_attempts_override || session.exams.max_attempts
    const { count: attemptCount } = await supabase
      .from('exam_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId)
      .eq('student_id', student_id)

    if (attemptCount && attemptCount >= maxAttempts) {
      return NextResponse.json({ error: `ทำข้อสอบครบ ${maxAttempts} ครั้งแล้ว` }, { status: 403 })
    }

    // 4. ดึงโจทย์ทั้งหมด
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', session.exams.id)
      .order('order_number', { ascending: true })

    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'ไม่มีโจทย์ในข้อสอบนี้' }, { status: 404 })
    }

    // 5. สุ่มลำดับโจทย์ (ถ้าเปิด)
    let shuffledQuestions = [...questions]
    if (session.exams.shuffle_questions) {
      shuffledQuestions = shuffledQuestions.sort(() => Math.random() - 0.5)
    }

    // 6. สุ่มตัวเลือก (ถ้าเปิด)
    const questionsWithOptions = shuffledQuestions.map((q: any) => {
      const options = [
        { key: 'A', value: q.option_a },
        { key: 'B', value: q.option_b },
        { key: 'C', value: q.option_c },
        { key: 'D', value: q.option_d },
      ].filter((opt: any) => opt.value)

      let shuffledOptions = [...options]
      if (session.exams.shuffle_options) {
        shuffledOptions = shuffledOptions.sort(() => Math.random() - 0.5)
      }

      const correctOption = shuffledOptions.find((opt: any) => opt.key === q.correct_answer)
      
      return {
        id: q.id,
        order_number: q.order_number,
        question_text: q.question_text,
        question_type: q.question_type,
        topic: q.topic,
        points: q.points,
        options: shuffledOptions.map((opt: any, idx: number) => ({
          key: String.fromCharCode(65 + idx),
          value: opt.value,
        })),
        correct_answer: q.correct_answer,
      }
    })

    // 7. สร้าง exam_attempt (บันทึกเวลาเป็น epoch milliseconds)
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .insert([{
        session_id: sessionId,
        student_id: student_id,
        started_at: now.toISOString(),
        started_at_epoch: Date.now(), // ⭐ บันทึกเวลาเป็น milliseconds
        answers: {},
      }])
      .select()
      .single()

    if (attemptError) throw attemptError

    return NextResponse.json({
      success: true,
      attempt_id: attempt.id,
      exam: {
        id: session.exams.id,
        title: session.exams.title,
        duration_minutes: session.exams.duration_minutes,
        passing_score: session.exams.passing_score,
      },
      questions: questionsWithOptions,
      total_questions: questionsWithOptions.length,
      started_at: attempt.started_at,
    })

  } catch (error: any) {
    console.error('Start exam error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}