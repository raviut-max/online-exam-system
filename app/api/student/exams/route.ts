import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: Request) {
  try {
    const { student_id, client_time } = await request.json()
    console.log('🔍 [API] รับข้อมูล:', { student_id, client_time })

    if (!student_id) {
      return NextResponse.json({ error: 'ต้องระบุ student_id' }, { status: 400 })
    }

    const now = client_time ? new Date(client_time) : new Date()
    console.log(' [API] เวลาปัจจุบัน:', now.toISOString())

    // 1. ดึงข้อมูลนักศึกษาและวิชาที่ลงทะเบียน
    // ⭐ ใช้ .maybeSingle() แทน .single() เพื่อป้องกัน throw error
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        full_name,
        section,
        course_enrollments (
          course_id,
          courses (
            id,
            course_code,
            course_name
          )
        )
      `)
      .eq('id', student_id)
      .maybeSingle() // ⭐ เปลี่ยนจาก .single() เป็น .maybeSingle()

    if (studentError || !student) {
      console.error('❌ [API] ไม่พบนักศึกษา:', studentError)
      return NextResponse.json({ 
        error: 'ไม่พบข้อมูลนักศึกษา',
        debug: { student_id, studentError }
      }, { status: 404 })
    }

    console.log('👤 [API] พบนักศึกษา:', student.full_name)

    // 2. ดึง course IDs ที่ลงทะเบียน
    const enrollments = student.course_enrollments || []
    console.log('📚 [API] จำนวน enrollment:', enrollments.length)

    const enrolledCourseIds: string[] = []
    for (const ce of enrollments) {
      if (ce?.course_id) {
        enrolledCourseIds.push(ce.course_id)
      }
    }

    console.log('📚 [API] Course IDs ที่ลงทะเบียน:', enrolledCourseIds)

    if (enrolledCourseIds.length === 0) {
      console.log('️ [API] นักศึกษาไม่ได้ลงทะเบียนวิชาใดเลย')
      return NextResponse.json({ 
        exams: [], 
        student: { 
          id: student.id, 
          student_code: student.student_code, 
          full_name: student.full_name, 
          section: student.section 
        }
      })
    }

    // 3. ⭐ ดึงข้อสอบที่ active (เพิ่ม course_id ใน select)
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select(`
        id,
        course_id,
        course_code,
        title,
        description,
        duration_minutes,
        passing_score,
        max_attempts,
        shuffle_questions,
        shuffle_options,
        exam_type,
        is_active,
        courses (
          course_name
        )
      `)
      .in('course_id', enrolledCourseIds)
      .eq('is_active', true)

    if (examsError) {
      console.error('❌ [API] Error ดึง exams:', examsError)
    }

    console.log('📝 [API] พบข้อสอบ:', exams?.length || 0)
    
    // ⭐ Debug: แสดงรายละเอียดข้อสอบที่พบ
    if (exams && exams.length > 0) {
      exams.forEach((exam: any) => {
        console.log('  📝 Exam:', {
          id: exam.id,
          title: exam.title,
          course_id: exam.course_id,
          course_code: exam.course_code,
          is_active: exam.is_active
        })
      })
    }

    if (!exams || exams.length === 0) {
      console.log('⚠️ [API] ไม่พบข้อสอบที่ active สำหรับวิชาที่ลงทะเบียน')
      return NextResponse.json({ 
        exams: [], 
        student: { 
          id: student.id, 
          student_code: student.student_code, 
          full_name: student.full_name, 
          section: student.section 
        }
      })
    }

    const examIds = exams.map((e: any) => e.id)
    console.log(' [API] Exam IDs:', examIds)

    // 4. ดึง sessions ทั้งหมด
    const { data: sessions, error: sessionsError } = await supabase
      .from('exam_sessions')
      .select('*')
      .in('exam_id', examIds)
      .eq('is_active', true)

    if (sessionsError) {
      console.error('❌ [API] Error ดึง sessions:', sessionsError)
    }

    console.log('📅 [API] พบ sessions:', sessions?.length || 0)

    // ⭐ Debug: แสดงรายละเอียด sessions
    if (sessions && sessions.length > 0) {
      sessions.forEach((session: any) => {
        console.log('  📅 Session:', {
          id: session.id,
          title: session.title,
          exam_id: session.exam_id,
          start_time: session.start_time,
          end_time: session.end_time,
          is_active: session.is_active
        })
      })
    }

    const activeSessions = sessions || []

    // 5. ตรวจสอบจำนวนครั้งที่ทำไปแล้ว
    const sessionIds = activeSessions.map((s: any) => s.id)
    let attemptCounts: Record<string, number> = {}

    if (sessionIds.length > 0) {
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('session_id')
        .in('session_id', sessionIds)
        .eq('student_id', student_id)

      if (attempts) {
        attempts.forEach((a: any) => {
          attemptCounts[a.session_id] = (attemptCounts[a.session_id] || 0) + 1
        })
      }
    }

    console.log('🔢 [API] Attempt counts:', attemptCounts)

    // 6. เพิ่มข้อมูล attempts_remaining ให้แต่ละ session
    const sessionsWithAttempts = activeSessions.map((session: any) => {
      const exam = exams.find((e: any) => e.id === session.exam_id)
      const maxAttempts = session.max_attempts_override || exam?.max_attempts || 1
      const doneCount = attemptCounts[session.id] || 0
      return {
        ...session,
        attempts_remaining: maxAttempts - doneCount,
        attempts_done: doneCount,
        max_attempts: maxAttempts,
      }
    })

    console.log('✅ [API] Sessions ที่พร้อมส่ง:', sessionsWithAttempts.length)

    // 7. ส่ง exams ที่มี sessions ทั้งหมดกลับมา
    const examsWithSessions = exams.map((exam: any) => ({
      ...exam,
      sessions: sessionsWithAttempts.filter((s: any) => s.exam_id === exam.id)
    }))

    return NextResponse.json({
      exams: examsWithSessions,
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
        section: student.section,
      }
    })

  } catch (error: any) {
    console.error('💥 [API] CRITICAL ERROR:', error)
    return NextResponse.json({ 
      error: error.message || 'เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์' 
    }, { status: 500 })
  }
}