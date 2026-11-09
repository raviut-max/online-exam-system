import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงรายละเอียดการตอบของ attempt นี้
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; attemptId: string }> }
) {
  try {
    const { id: examId, attemptId } = await params
    
    console.log('🔍 [API Attempt Detail] examId:', examId)
    console.log('🔍 [API Attempt Detail] attemptId:', attemptId)

    // 1. ดึง attempt + ข้อมูลนักศึกษา (ไม่เอา section จาก students)
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        students(student_code, full_name),
        exam_sessions(title, time_mode, exam_id)
      `)
      .eq('id', attemptId)
      .maybeSingle()

    console.log('📦 [API Attempt Detail] Query Result:', { 
      attempt: attempt ? 'found' : 'not found', 
      attemptError 
    })

    if (attemptError || !attempt) {
      console.error('❌ [API Attempt Detail] หา attempt ไม่เจอ!')
      return NextResponse.json({ error: 'ไม่พบข้อมูลการสอบ' }, { status: 404 })
    }

    // 2. ⭐ ดึง section จาก course_enrollments (แทนที่จะดึงจาก students)
    const courseId = attempt.exam_sessions?.exam_id || examId
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('section')
      .eq('student_id', attempt.student_id)
      .eq('course_id', courseId)
      .maybeSingle()

    const section = enrollment?.section || '-'
    console.log('📦 [API Attempt Detail] Section:', section)

    // 3. ดึงข้อสอบทั้งหมด + คำตอบที่ถูกต้อง
    const { data: questions, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true })

    console.log('📦 [API Attempt Detail] Questions:', { 
      count: questions?.length || 0, 
      questionsError 
    })

    if (questionsError || !questions) {
      return NextResponse.json({ error: 'ไม่พบโจทย์' }, { status: 404 })
    }

    // 4. รวมข้อมูล: โจทย์ + คำตอบนักศึกษา + คำตอบที่ถูก
    const answers = attempt.answers || {}
    const results = questions.map((q: any, idx: number) => {
      const studentAnswer = answers[q.id] || null
      const isCorrect = studentAnswer === q.correct_answer
      
      return {
        order: idx + 1,
        question_id: q.id,
        question_text: q.question_text,
        topic: q.topic,
        points: q.points,
        correct_answer: q.correct_answer,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        explanation: q.explanation,
        options: [
          { key: 'A', value: q.option_a },
          { key: 'B', value: q.option_b },
          { key: 'C', value: q.option_c },
          { key: 'D', value: q.option_d },
        ].filter((opt: any) => opt.value),
      }
    })

    console.log('✅ [API Attempt Detail] ส่งข้อมูลกลับ:', {
      attempt_id: attempt.id,
      student: attempt.students?.full_name,
      total_questions: results.length,
    })

    return NextResponse.json({
      attempt: {
        id: attempt.id,
        student_code: attempt.students?.student_code,
        full_name: attempt.students?.full_name,
        section: section, // ⭐ ใช้ section ที่ดึงจาก course_enrollments
        session_title: attempt.exam_sessions?.title,
        started_at: attempt.started_at,
        submitted_at: attempt.submitted_at,
        time_used: attempt.time_used,
        score: attempt.score,
        total_score: attempt.total_score,
        percentage: attempt.percentage,
        passed: attempt.passed,
      },
      results,
    })
  } catch (error: any) {
    console.error('❌ [API Attempt Detail] Error โดยรวม:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}