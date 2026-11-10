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
    const { id: examId } = await params
    const { student_id, session_id } = await request.json()

    if (!student_id || !session_id) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // 1. ตรวจสอบ session และดึงข้อมูล exam
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select(`
        *,
        exams (
          id,
          title,
          duration_minutes,
          passing_score,
          max_attempts,
          shuffle_questions,
          shuffle_options
        )
      `)
      .eq('id', session_id)
      .eq('exam_id', examId)
      .single()

    if (sessionError || !session) {
      console.error('❌ [Start Exam] ไม่พบ session:', sessionError)
      return NextResponse.json({ error: 'ไม่พบรอบสอบ' }, { status: 404 })
    }

    const exam = session.exams

    // 2. ตรวจสอบเวลา
    const now = new Date()
    const startTime = new Date(session.start_time)
    const endTime = new Date(session.end_time)

    if (now < startTime) {
      return NextResponse.json({ error: 'รอบสอบยังไม่เริ่ม' }, { status: 403 })
    }
    if (now > endTime) {
      return NextResponse.json({ error: 'รอบสอบหมดเวลาแล้ว' }, { status: 403 })
    }

    // 3. ตรวจสอบจำนวนครั้งที่ทำไปแล้ว
    const { data: attempts } = await supabase
      .from('exam_attempts')
      .select('id')
      .eq('session_id', session_id)
      .eq('student_id', student_id)

    const maxAttempts = session.max_attempts_override || exam?.max_attempts || 1
    const doneCount = attempts?.length || 0

    if (doneCount >= maxAttempts) {
      return NextResponse.json({ error: `ทำข้อสอบครบ ${maxAttempts} ครั้งแล้ว` }, { status: 403 })
    }

    // 4. ดึงโจทย์ (รวม option_e และ option_f)
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true })

    let finalQuestions = questions || []

    // 5. สุ่มลำดับข้อ
    if (exam?.shuffle_questions) {
      finalQuestions = [...finalQuestions].sort(() => Math.random() - 0.5)
    }

    // 6. สุ่มตัวเลือก (A-F)
    if (exam?.shuffle_options) {
      finalQuestions = finalQuestions.map((q: any) => {
        const opts: { key: string, value: string }[] = []
        if (q.option_a) opts.push({ key: 'A', value: q.option_a })
        if (q.option_b) opts.push({ key: 'B', value: q.option_b })
        if (q.option_c) opts.push({ key: 'C', value: q.option_c })
        if (q.option_d) opts.push({ key: 'D', value: q.option_d })
        if (q.option_e) opts.push({ key: 'E', value: q.option_e }) // ⭐ เพิ่ม option_e
        if (q.option_f) opts.push({ key: 'F', value: q.option_f }) // ⭐ เพิ่ม option_f

        opts.sort(() => Math.random() - 0.5)

        const newQ = { 
          ...q, 
          option_a: null, 
          option_b: null, 
          option_c: null, 
          option_d: null, 
          option_e: null, 
          option_f: null 
        }
        const labels = ['option_a', 'option_b', 'option_c', 'option_d', 'option_e', 'option_f']
        const keyMap: Record<string, string> = {}

        opts.forEach((opt, idx) => {
          const newLabel = String.fromCharCode(65 + idx)
          keyMap[opt.key] = newLabel
          newQ[labels[idx]] = opt.value
        })

        newQ.correct_answer = keyMap[q.correct_answer] || q.correct_answer
        return newQ
      })
    }

    // 7. สร้าง attempt
    const startedAt = new Date()
    const { data: attempt, error: createError } = await supabase
      .from('exam_attempts')
      .insert({
        session_id: session_id,
        student_id: student_id,
        started_at: startedAt.toISOString(),
        started_at_epoch: Math.floor(startedAt.getTime() / 1000),
        answers: {},
      })
      .select()
      .single()

    if (createError) {
      console.error('❌ [Start Exam] สร้าง attempt ไม่สำเร็จ:', createError)
      return NextResponse.json({ error: 'ไม่สามารถเริ่มทำข้อสอบได้: ' + createError.message }, { status: 500 })
    }

    // 8. ลบ correct_answer ออกจาก questions ก่อนส่งกลับ
    const questionsForStudent = finalQuestions.map((q: any) => {
      const { correct_answer, explanation, ...rest } = q
      return rest
    })

    console.log('✅ [Start Exam] ส่งข้อมูลข้อสอบ:', {
      exam_id: examId,
      questions_count: questionsForStudent.length,
      has_option_e: questionsForStudent[0]?.option_e ? 'Yes' : 'No'
    })

    return NextResponse.json({
      success: true,
      attempt_id: attempt.id,
      exam: {
        id: examId,
        title: exam?.title,
        duration_minutes: exam?.duration_minutes,
        passing_score: exam?.passing_score,
      },
      questions: questionsForStudent,
      started_at: startedAt.toISOString(),
    })

  } catch (error: any) {
    console.error('💥 [Start Exam] CRITICAL ERROR:', error)
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 })
  }
}