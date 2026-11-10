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

    console.log('🔍 [Enroll API] ลงทะเบียน:', { student_code, course_code, section: sectionValue })

    // 1. หา student_id
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', student_code)
      .limit(1)

    if (studentError || !students || students.length === 0) {
      return NextResponse.json({ error: 'ไม่พบนักศึกษา' }, { status: 404 })
    }
    const student = students[0]

    // ⭐ 2. หา course_id โดยดูเฉพาะ course_code (ไม่รวม section)
    const { data: courses, error: courseError } = await supabase
      .from('courses')
      .select('id, course_code, course_name, section')
      .eq('course_code', course_code)
      .limit(1)

    if (courseError || !courses || courses.length === 0) {
      return NextResponse.json({
        error: `ไม่พบวิชา ${course_code} (ต้องสร้างวิชาก่อน)`,
      }, { status: 404 })
    }
    const course = courses[0]

    console.log(`✅ [Enroll API] พบวิชา: ${course.course_code} (ID: ${course.id})`)

    // 3. เช็คซ้ำก่อน insert
    const { data: existing, error: enrollError } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('student_id', student.id)
      .eq('course_id', course.id)
      .eq('section', sectionValue)
      .limit(1)

    if (enrollError) {
      console.error('❌ [Enroll API] ตรวจสอบ enrollment error:', enrollError)
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการตรวจสอบ' }, { status: 500 })
    }

    if (existing && existing.length > 0) {
      console.log(`⏭️ [Enroll API] ลงทะเบียนแล้ว: ${student_code} → ${course_code}`)
      return NextResponse.json({
        success: true,
        message: 'ลงทะเบียนแล้ว',
      })
    }

    // 4. ลงทะเบียน
    const { error: insertError } = await supabase
      .from('course_enrollments')
      .insert({
        student_id: student.id,
        course_id: course.id,
        section: sectionValue,
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ success: true, message: 'ลงทะเบียนแล้ว' })
      }
      console.error('❌ [Enroll API] Insert error:', insertError)
      throw insertError
    }

    console.log(`✅ [Enroll API] ลงทะเบียนสำเร็จ: ${student_code} → ${course_code} Section ${sectionValue}`)
    return NextResponse.json({
      success: true,
      message: 'ลงทะเบียนสำเร็จ',
      detail: `${student_code} → ${course_code} กลุ่ม ${sectionValue}`,
    })
  } catch (error: any) {
    console.error('💥 [Enroll API] CRITICAL ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}