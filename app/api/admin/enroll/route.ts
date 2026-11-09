import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_code, course_code, section } = await request.json()
    const sectionValue = section || '001'

    // 1. หา student_id
    const { data: students } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', student_code)
      .limit(1)

    if (!students || students.length === 0) {
      return NextResponse.json({ error: 'ไม่พบนักศึกษา' }, { status: 404 })
    }
    const student = students[0]

    // 2. ⭐ หา course_id โดยระบุ section ด้วย (แก้ bug!)
    const { data: courses } = await supabase
      .from('courses')
      .select('id, course_code, section')
      .eq('course_code', course_code)
      .eq('section', sectionValue)
      .limit(1)

    if (!courses || courses.length === 0) {
      return NextResponse.json({ 
        error: `ไม่พบวิชา ${course_code} กลุ่ม ${sectionValue} (ต้องสร้างวิชาก่อน)` 
      }, { status: 404 })
    }
    const course = courses[0]

    // 3. เช็คซ้ำก่อนinsert (กัน error ซ้ำซ้อน)
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', course.id)
      .eq('section', sectionValue)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'ลงทะเบียนแล้ว' 
      })
    }

    // 4. ลงทะเบียน
    const { error } = await supabase
      .from('course_enrollments')
      .insert({
        student_id: student.id,
        course_id: course.id,
        section: sectionValue,
      })

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ success: true, message: 'ลงทะเบียนแล้ว' })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      message: 'ลงทะเบียนสำเร็จ',
      detail: `${student_code} → ${course_code} กลุ่ม ${sectionValue}`
    })
  } catch (error: any) {
    console.error('Enroll error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}