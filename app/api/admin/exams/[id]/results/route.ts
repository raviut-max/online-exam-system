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

    // 1. ดึงข้อมูลข้อสอบพร้อม course_id
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*, courses(course_name)')
      .eq('id', examId)
      .single()

    if (examError || !exam) {
      return NextResponse.json({ error: 'ไม่พบข้อมูลข้อสอบ' }, { status: 404 })
    }

    const courseId = exam.course_id

    // 2. หา session_id ทั้งหมดของข้อสอบนี้
    const { data: sessions, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id')
      .eq('exam_id', examId)

    const sessionIds = sessions?.map((s: any) => s.id) || []

    if (sessionIds.length === 0) {
      return NextResponse.json({
        exam_info: exam,
        results: []
      })
    }

    // 3. ดึงผลการสอบทั้งหมดที่ส่งแล้ว
    const { data: attempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select(`
        id,
        student_id,
        session_id,
        started_at,
        submitted_at,
        time_used,
        score,
        total_score,
        percentage,
        passed
      `)
      .in('session_id', sessionIds)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })

    if (attemptsError) {
      console.error('Error fetching attempts:', attemptsError)
      return NextResponse.json({ 
        error: 'ไม่สามารถดึงข้อมูลผลการสอบได้: ' + attemptsError.message 
      }, { status: 500 })
    }

    // 4. ดึงรายชื่อนักศึกษาทั้งหมดที่ส่งข้อสอบ
    const studentIds = [...new Set((attempts || []).map((a: any) => a.student_id))]
    
    let studentsMap: Record<string, any> = {}
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from('students')
        .select('id, student_code, full_name, year')
        .in('id', studentIds)
      
      if (students) {
        students.forEach((s: any) => {
          studentsMap[s.id] = s
        })
      }
    }

    // 5. ⭐ ดึง section จาก course_enrollments ของวิชานี้
    let enrollmentsMap: Record<string, string> = {}
    if (courseId && studentIds.length > 0) {
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id, section')
        .eq('course_id', courseId)
        .in('student_id', studentIds)
      
      if (enrollments) {
        enrollments.forEach((e: any) => {
          enrollmentsMap[e.student_id] = e.section
        })
      }
    }

    // 6. รวมข้อมูลและส่งกลับ
    const results = (attempts || []).map((a: any) => {
      const student = studentsMap[a.student_id] || {}
      return {
        id: a.id,
        student_id: a.student_id,
        student_code: student.student_code || 'N/A',
        full_name: student.full_name || 'N/A',
        year: student.year || 'N/A',
        section: enrollmentsMap[a.student_id] || 'N/A', // ⭐ ดึง section จาก enrollment
        score: a.score,
        total_score: a.total_score,
        percentage: a.percentage,
        passed: a.passed,
        time_used: a.time_used,
        submitted_at: a.submitted_at,
      }
    })

    return NextResponse.json({
      exam_info: exam,
      results: results
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ 
      error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 })
  }
}