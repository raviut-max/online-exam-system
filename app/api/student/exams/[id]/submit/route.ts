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
    const { id: attemptId } = await params
    console.log('🔍 [API Submit] ได้รับ attemptId:', attemptId)

    if (!attemptId) {
      return NextResponse.json({ error: 'ไม่พบรหัสการสอบ (attemptId)' }, { status: 400 })
    }

    // ดึงข้อมูล attempt + session + exam + questions
    const { data: attempt, error } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        exam_sessions(
          *,
          exams(
            *,
            questions(*)
          )
        )
      `)
      .eq('id', attemptId)
      .single()

    if (error || !attempt) {
      console.error('❌ [API Submit] หา attempt ไม่เจอ! Supabase Error:', error)
      return NextResponse.json({ error: 'ไม่พบการสอบ' }, { status: 404 })
    }

    if (attempt.submitted_at) {
      return NextResponse.json({ error: 'ส่งข้อสอบนี้ไปแล้ว' }, { status: 400 })
    }

    // ⭐ คำนวณเวลาที่ใช้จาก epoch milliseconds (ไม่สน timezone)
    const now = Date.now()
    const startedAtEpoch = attempt.started_at_epoch || new Date(attempt.started_at).getTime()
    const timeUsed = Math.floor((now - startedAtEpoch) / 1000 / 60) // นาที
    
    console.log('🕐 [API Submit] เวลาที่ใช้:', timeUsed, 'นาที', 
                '(now:', now, ', started_at_epoch:', startedAtEpoch, ')')

    const questions = attempt.exam_sessions.exams.questions
    const answers = attempt.answers || {}
    
    let correctCount = 0
    let totalPoints = 0
    let earnedPoints = 0

    const questionResults = questions.map((q: any) => {
      const studentAnswer = answers[q.id] || null
      const isCorrect = studentAnswer === q.correct_answer
      const points = q.points || 1

      totalPoints += points
      if (isCorrect) {
        correctCount++
        earnedPoints += points
      }

      return {
        question_id: q.id,
        question_text: q.question_text,
        correct_answer: q.correct_answer,
        student_answer: studentAnswer,
        is_correct: isCorrect,
        points: points,
        earned_points: isCorrect ? points : 0,
      }
    })

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0
    const passed = percentage >= attempt.exam_sessions.exams.passing_score

    const { error: updateError } = await supabase
      .from('exam_attempts')
      .update({
        submitted_at: new Date().toISOString(),
        time_used: timeUsed,
        score: earnedPoints,
        total_score: totalPoints,
        percentage: percentage,
        passed: passed,
        answers: {
          ...answers,
          _results: questionResults,
        },
      })
      .eq('id', attemptId)

    if (updateError) {
      console.error('❌ [API Submit] อัพเดทผลสอบไม่สำเร็จ:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      result: {
        score: earnedPoints,
        total_score: totalPoints,
        percentage: percentage,
        passed: passed,
        correct_count: correctCount,
        total_questions: questions.length,
        time_used: timeUsed,
      },
    })

  } catch (error: any) {
    console.error('❌ [API Submit] Error โดยรวม:', error)
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' }, { status: 500 })
  }
}