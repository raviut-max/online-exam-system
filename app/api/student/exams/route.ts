import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_id, client_time } = await request.json()

    console.log('🔍 [Student Exams API] รับข้อมูล:', { 
      student_id, 
      client_time: client_time || 'ไม่ระบุ (ใช้ server time)' 
    })

    if (!student_id) {
      return NextResponse.json({ error: 'ต้องระบุ student_id' }, { status: 400 })
    }

    // ⭐ ใช้เวลาจาก client ถ้ามี (แก้ปัญหา Timezone Mismatch)
    const now = client_time ? new Date(client_time) : new Date()
    console.log('🕐 [Student Exams API] เวลาปัจจุบัน:', now.toISOString())

    // 1. ดึงข้อมูลนักศึกษา + วิชาที่ลงทะเบียน
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        full_name,
        section,
        course_enrollments(
          course_id,
          section,
          courses(
            id,
            course_code,
            course_name
          )
        )
      `)
      .eq('id', student_id)
      .single()

    if (studentError || !student) {
      console.error('❌ [Student Exams API] ไม่พบนักศึกษา:', studentError)
      return NextResponse.json({ error: 'ไม่พบข้อมูลนักศึกษา' }, { status: 404 })
    }

    console.log('📦 [Student Exams API] นักศึกษา:', {
      id: student.id,
      name: student.full_name,
      enrolled_courses: student.course_enrollments?.length || 0
    })

    // 2. ดึง course IDs ที่นักศึกษาลงทะเบียน
    const enrolledCourseIds = (student.course_enrollments || [])
      .map((ce: any) => ce.course_id)
      .filter((id: string) => id !== null)

    if (enrolledCourseIds.length === 0) {
      console.log('⚠️ [Student Exams API] นักศึกษายังไม่ได้ลงทะเบียนวิชาใดๆ')
      return NextResponse.json({ 
        available_exams: [], 
        upcoming_exams: [], 
        student 
      })
    }

    console.log('📚 [Student Exams API] วิชาที่ลงทะเบียน:', enrolledCourseIds)

    // 3. ดึงข้อสอบที่ active และอยู่ในวิชาที่ลงทะเบียน
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select(`
        id,
        course_code,
        title,
        description,
        duration_minutes,
        passing_score,
        max_attempts,
        shuffle_questions,
        shuffle_options,
        exam_type,
        courses(
          course_name
        )
      `)
      .in('course_id', enrolledCourseIds)
      .eq('is_active', true)

    if (examsError) {
      console.error('❌ [Student Exams API] ดึงข้อสอบไม่สำเร็จ:', examsError)
      return NextResponse.json({ error: 'ไม่สามารถดึงข้อมูลข้อสอบได้' }, { status: 500 })
    }

    console.log('📝 [Student Exams API] พบข้อสอบทั้งหมด:', exams?.length || 0)

    if (!exams || exams.length === 0) {
      return NextResponse.json({ 
        available_exams: [], 
        upcoming_exams: [], 
        student 
      })
    }

    // 4. ดึง sessions ทั้งหมด (ไม่กรองเวลา)
    const examIds = exams.map((e: any) => e.id)
    
    const { data: sessions, error: sessionsError } = await supabase
      .from('exam_sessions')
      .select('*')
      .in('exam_id', examIds)
      .eq('is_active', true)

    if (sessionsError) {
      console.error('❌ [Student Exams API] ดึง sessions ไม่สำเร็จ:', sessionsError)
    }

    console.log('📅 [Student Exams API] พบ sessions:', sessions?.length || 0)

    // 5. ตรวจสอบจำนวนครั้งที่ทำไปแล้ว
    const sessionIds = (sessions || []).map((s: any) => s.id)
    
    const { data: attempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select('session_id, student_id')
      .in('session_id', sessionIds)
      .eq('student_id', student_id)

    if (attemptsError) {
      console.error('❌ [Student Exams API] ดึง attempts ไม่สำเร็จ:', attemptsError)
    }

    // นับจำนวนครั้งที่ทำไปแล้วต่อ session
    const attemptCounts: Record<string, number> = {}
    ;(attempts || []).forEach((a: any) => {
      attemptCounts[a.session_id] = (attemptCounts[a.session_id] || 0) + 1
    })

    // 6. แยก sessions เป็น 2 กลุ่ม: available และ upcoming
    const availableSessions: any[] = []
    const upcomingSessions: any[] = []

    ;(sessions || []).forEach((session: any) => {
      const exam = exams.find((e: any) => e.id === session.exam_id)
      if (!exam) return

      const startTime = new Date(session.start_time)
      const endTime = new Date(session.end_time)
      const maxAttempts = session.max_attempts_override || exam.max_attempts || 1
      const doneCount = attemptCounts[session.id] || 0
      const remaining = maxAttempts - doneCount

      const sessionData = {
        id: session.id,
        title: session.title,
        time_mode: session.time_mode,
        start_time: session.start_time,
        end_time: session.end_time,
        max_attempts: maxAttempts,
        attempts_done: doneCount,
        attempts_remaining: remaining,
        is_available: now >= startTime && now <= endTime && remaining > 0,
        is_upcoming: now < startTime,
        is_ended: now > endTime,
      }

      if (sessionData.is_available) {
        availableSessions.push(sessionData)
      } else if (sessionData.is_upcoming && remaining > 0) {
        upcomingSessions.push(sessionData)
      }
    })

    console.log('✅ [Student Exams API] Available sessions:', availableSessions.length)
    console.log('⏳ [Student Exams API] Upcoming sessions:', upcomingSessions.length)

    // 7. จัดกลุ่ม sessions ตาม exam
    const availableExams = exams.map((exam: any) => {
      const examSessions = availableSessions.filter((s: any) => s.exam_id === exam.id)
      return {
        ...exam,
        sessions: examSessions,
      }
    }).filter((exam: any) => exam.sessions.length > 0)

    const upcomingExams = exams.map((exam: any) => {
      const examSessions = upcomingSessions.filter((s: any) => s.exam_id === exam.id)
      return {
        ...exam,
        sessions: examSessions,
      }
    }).filter((exam: any) => exam.sessions.length > 0)

    return NextResponse.json({
      available_exams: availableExams,
      upcoming_exams: upcomingExams,
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        section: student.section,
      }
    })

  } catch (error: any) {
    console.error('❌ [Student Exams API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}