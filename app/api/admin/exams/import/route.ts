import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: Import ข้อสอบจาก JSON (สร้างเฉพาะตัวข้อสอบ ไม่มีเวลา)
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { metadata, questions } = body

    // 1. Validate โครงสร้าง
    if (!metadata || !questions) {
      return NextResponse.json({ 
        error: 'ไฟล์ JSON ต้องมี metadata และ questions' 
      }, { status: 400 })
    }

    if (!metadata.course_code || !metadata.title || !metadata.duration_minutes) {
      return NextResponse.json({ 
        error: 'metadata ต้องมี course_code, title, duration_minutes' 
      }, { status: 400 })
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ 
        error: 'questions ต้องเป็น array และไม่ว่าง' 
      }, { status: 400 })
    }

    // 2. เช็คว่ามีวิชานี้ไหม
    const { data: course } = await supabase
      .from('courses')
      .select('id, course_code, course_name')
      .eq('course_code', metadata.course_code)
      .limit(1)
      .single()

    if (!course) {
      return NextResponse.json({ 
        error: `ไม่พบวิชา ${metadata.course_code} ในระบบ` 
      }, { status: 404 })
    }

    // 2.5 เช็คว่ามีข้อสอบชื่อนี้อยู่แล้วไหม
    const { data: existingExam } = await supabase
      .from('exams')
      .select('id, title')
      .eq('course_code', metadata.course_code)
      .eq('title', metadata.title)
      .maybeSingle()

    if (existingExam) {
      return NextResponse.json({ 
        error: `มีข้อสอบชื่อ "${metadata.title}" ของวิชานี้อยู่แล้ว (ID: ${existingExam.id})\nหากต้องการ Import ใหม่ กรุณาลบข้อสอบเดิมก่อน`,
        existing_exam_id: existingExam.id
      }, { status: 409 })
    }

    // 3. สร้างชุดข้อสอบ (ไม่มีเวลาแล้ว)
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert([{
        course_id: course.id,
        course_code: metadata.course_code,
        title: metadata.title,
        description: metadata.description || '',
        exam_type: metadata.exam_type || 'midterm',
        duration_minutes: parseInt(metadata.duration_minutes),
        passing_score: parseInt(metadata.passing_score) || 50,
        max_attempts: metadata.max_attempts || 1,
        shuffle_questions: metadata.shuffle_questions || false,
        shuffle_options: metadata.shuffle_options || false,
        is_active: true, // ⭐ เปิดใช้งานเลย (ตัวข้อสอบ)
      }])
      .select()
      .single()

    if (examError) throw examError

    // 4. เพิ่มโจทย์ทั้งหมด
    const questionInserts = questions.map((q: any, idx: number) => ({
      exam_id: exam.id,
      order_number: q.order || idx + 1,
      question_type: q.type || 'multiple_choice',
      topic: q.topic || '',
      question_text: q.question,
      option_a: q.options?.A || '',
      option_b: q.options?.B || '',
      option_c: q.options?.C || '',
      option_d: q.options?.D || '',
      correct_answer: (q.correct_answer || 'A').toUpperCase(),
      points: q.points || 1,
      explanation: q.explanation || '',
    }))

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionInserts)

    if (questionsError) throw questionsError

    return NextResponse.json({
      success: true,
      exam: {
        id: exam.id,
        title: exam.title,
        course_code: metadata.course_code,
        course_name: course.course_name,
      },
      stats: {
        total_questions: questions.length,
        total_points: questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0),
      },
      message: `Import สำเร็จ! สร้างข้อสอบ "${exam.title}" จำนวน ${questions.length} ข้อ\n⚠️ อย่าลืมสร้าง "รอบสอบ" (Session) ก่อนให้นักศึกษาทำ`,
      next_step: 'สร้างรอบสอบ'
    })

  } catch (error: any) {
    console.error('Import exam error:', error)
    return NextResponse.json({ 
      error: error.message || 'เกิดข้อผิดพลาดในการ Import' 
    }, { status: 500 })
  }
}