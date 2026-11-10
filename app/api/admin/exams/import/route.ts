import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ฟังก์ชันล้าง Space ออกจาก Key และ Value ทั้งหมดใน JSON
function cleanJSON(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'string') return obj.trim()
  if (Array.isArray(obj)) return obj.map(cleanJSON)
  if (typeof obj === 'object') {
    const newObj: any = {}
    for (const key of Object.keys(obj)) {
      newObj[key.trim()] = cleanJSON(obj[key])
    }
    return newObj
  }
  return obj
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.json()
    const body = cleanJSON(rawBody) // ล้าง Space ทั้งหมด
    const { metadata, questions } = body

    if (!metadata || !questions) {
      return NextResponse.json({ error: 'รูปแบบ JSON ไม่ถูกต้อง' }, { status: 400 })
    }

    console.log('📥 [Import] เริ่มนำเข้าข้อสอบ:', metadata.course_code)

    // 1. หาหรือสร้าง Course (เช็คทั้ง course_code และ section)
    // ⭐ ใช้ .limit(1) แทน .single() เพื่อป้องกัน error ถ้ามีหลาย records
    let { data: courses } = await supabase
      .from('courses')
      .select('id')
      .eq('course_code', metadata.course_code)
      .eq('section', metadata.section || '001') // ⭐ เพิ่มเช็ค section
      .limit(1)

    let course = courses?.[0] || null

    if (!course) {
      // สร้าง course ใหม่ถ้าไม่มี
      const { data: newCourse, error } = await supabase
        .from('courses')
        .insert({
          course_code: metadata.course_code,
          course_name: metadata.course_name,
          section: metadata.section || '001', // ⭐ เพิ่ม section
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: 'สร้างวิชาไม่ได้: ' + error.message }, { status: 500 })
      }
      course = newCourse
      console.log('✅ [Import] สร้าง course ใหม่:', course.id)
    } else {
      console.log('✅ [Import] ใช้ course ที่มีอยู่:', course.id)
    }

    // 2. สร้าง Exam
    const { data: exam, error: examErr } = await supabase
      .from('exams')
      .insert({
        course_id: course.id,
        course_code: metadata.course_code,
        title: metadata.title,
        description: metadata.description || '',
        exam_type: metadata.exam_type || 'final',
        duration_minutes: metadata.duration_minutes || 60,
        passing_score: metadata.passing_score || 50,
        max_attempts: metadata.max_attempts || 1,
        shuffle_questions: metadata.shuffle_questions || false,
        shuffle_options: metadata.shuffle_options || false,
        is_active: true,
      })
      .select()
      .single()

    if (examErr) {
      return NextResponse.json({ error: 'สร้าง Exam ไม่ได้: ' + examErr.message }, { status: 500 })
    }

    console.log('✅ [Import] สร้าง exam สำเร็จ:', exam.id)

    // 3. สร้าง Session (ถ้ามีเวลา)
    if (metadata.start_time && metadata.end_time) {
      const { error: sessionErr } = await supabase
        .from('exam_sessions')
        .insert({
          exam_id: exam.id,
          title: 'รอบสอบหลัก',
          time_mode: 'fixed',
          start_time: metadata.start_time,
          end_time: metadata.end_time,
          is_active: true,
          max_attempts_override: metadata.max_attempts || 1,
        })

      if (sessionErr) {
        console.warn('⚠️ [Import] สร้าง session ไม่สำเร็จ:', sessionErr.message)
      } else {
        console.log('✅ [Import] สร้าง session สำเร็จ')
      }
    }

    // 4. Insert Questions (รองรับ A-F)
    const questionsToInsert = questions.map((q: any, idx: number) => {
      const options = q.options || {}
      
      return {
        exam_id: exam.id,
        question_text: q.question,
        option_a: options.A || null,
        option_b: options.B || null,
        option_c: options.C || null,
        option_d: options.D || null,
        option_e: options.E || null, // ⭐ เพิ่ม option_e
        option_f: options.F || null, // ⭐ เพิ่ม option_f (เผื่ออนาคต)
        correct_answer: q.correct_answer,
        points: q.points || 1,
        order_number: q.order || idx + 1,
        explanation: q.explanation || '',
        question_type: q.type || 'multiple_choice',
        topic: q.topic || '',
      }
    })

    const { error: qErr } = await supabase
      .from('questions')
      .insert(questionsToInsert)

    if (qErr) {
      return NextResponse.json({ error: 'บันทึกโจทย์ไม่ได้: ' + qErr.message }, { status: 500 })
    }

    console.log('✅ [Import] บันทึกโจทย์สำเร็จ:', questions.length, 'ข้อ')

    return NextResponse.json({
      success: true,
      exam_id: exam.id,
      questions_imported: questions.length,
      message: `นำเข้า "${metadata.title}" สำเร็จ (${questions.length} ข้อ)`,
    })

  } catch (error: any) {
    console.error('💥 [Import] CRITICAL ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}