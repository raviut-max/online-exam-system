import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงรายงานนักศึกษาแยกตามวิชาและ section
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const courseCode = searchParams.get('course_code') || ''
    const section = searchParams.get('section') || ''

    // ดึงวิชาทั้งหมด
    let courseQuery = supabase.from('courses').select('*').order('course_code')
    if (courseCode) courseQuery = courseQuery.eq('course_code', courseCode)
    if (section) courseQuery = courseQuery.eq('section', section)
    
    const { data: courses, error: courseError } = await courseQuery
    if (courseError) throw courseError

    // สำหรับแต่ละวิชา ดึงรายชื่อนักศึกษา
    const report = []
    for (const course of courses || []) {
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id, enrolled_at')
        .eq('course_id', course.id)
        .eq('section', course.section)

      const studentIds = (enrollments || []).map((e: any) => e.student_id)
      let students: any[] = []
      
      if (studentIds.length > 0) {
        const { data } = await supabase
          .from('students')
          .select('*')
          .in('id', studentIds)
          .order('student_code')
        students = data || []
      }

      report.push({
        course: course,
        student_count: students.length,
        students: students,
      })
    }

    return NextResponse.json({ report })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}