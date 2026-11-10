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
    const body = await request.json()
    const { attempt_id, answers, time_used } = body

    console.log('📤 [Submit API] รับข้อมูล:', { examId, attempt_id, answersCount: Object.keys(answers || {}).length })

    if (!attempt_id || !answers) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน' }, { status: 400 })
    }

    // 1. ดึง Attempt และ Exam พร้อม shuffle_map
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select(`
        *,
        shuffle_map,
        exam_sessions (
          exam_id,
          exams (
            passing_score
          )
        )
      `)
      .eq('id', attempt_id)
      .single()

    if (attemptError || !attempt) {
      console.error('❌ [Submit API] ไม่พบ attempt:', attemptError)
      return NextResponse.json({ error: 'ไม่พบข้อมูลการสอบ' }, { status: 404 })
    }

    // 2. ดึงโจทย์มาตรวจคะแนน
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, correct_answer, points')
      .eq('exam_id', examId)

    if (qError) {
      console.error('⚠️ [Submit API] ดึงโจทย์ไม่ได้:', qError)
    }

    let totalScore = 0
    let earnedScore = 0
    const shuffleMap = attempt?.shuffle_map || {}

    // ⭐ 3. ตรวจคำตอบ (ใช้ shuffle_map ถ้ามี)
    if (questions && Array.isArray(questions)) {
      questions.forEach((q: any) => {
        const qPoints = Number(q.points) || 1
        totalScore += qPoints

        const userAns = String(answers[q.id] || '').trim().toUpperCase()
        const correctAns = String(q.correct_answer || '').trim().toUpperCase()

        // ⭐ ถ้ามี shuffle_map ให้แปลงคำตอบกลับเป็นต้นฉบับ
        let actualUserAns = userAns
        if (shuffleMap[q.id]) {
          // shuffleMap[q.id] = { "A": "C", "B": "A", ... }
          // หมายความว่า นักศึกษาเห็น "A" แต่จริงๆ คือตัวเลือกต้นฉบับ "C"
          actualUserAns = shuffleMap[q.id][userAns] || userAns
        }

        if (actualUserAns === correctAns) {
          earnedScore += qPoints
        }
      })
    }

    const percentage = totalScore > 0 ? (earnedScore / totalScore) * 100 : 0
    const passingScore = Number(attempt.exam_sessions?.exams?.passing_score) || 50

    console.log('📊 [Submit API] ผลคะแนน:', { earnedScore, totalScore, percentage, passed: percentage >= passingScore })

    // 4. อัปเดตคะแนนลง DB
    const { error: updateError } = await supabase
      .from('exam_attempts')
      .update({
        answers: answers,
        submitted_at: new Date().toISOString(),
        time_used: Number(time_used) || 0,
        score: earnedScore,
        total_score: totalScore,
        percentage: percentage,
        passed: percentage >= passingScore,
      })
      .eq('id', attempt_id)

    if (updateError) {
      console.error('❌ [Submit API] อัพเดทไม่สำเร็จ:', updateError)
      return NextResponse.json({ error: 'บันทึกผลไม่ได้: ' + updateError.message }, { status: 500 })
    }

    // 5. ส่งกลับแค่ Success (ไม่ส่ง score กลับไปให้นักศึกษาเห็น)
    return NextResponse.json({
      success: true,
      message: 'ส่งข้อสอบเรียบร้อยแล้ว'
    })

  } catch (error: any) {
    console.error('💥 [Submit API] CRITICAL ERROR:', error)
    return NextResponse.json({
      error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์'
    }, { status: 500 })
  }
}