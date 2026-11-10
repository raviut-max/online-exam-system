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
    console.log('🕐 [API] เวลาปัจจุบัน:', now.toISOString())

    // 1. ดึงข้อมูลนักศึกษาและวิชาที่ลงทะเบียน
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select(`
        id,
        student_code,
        full_name,
        section,
        course_enrollments (
          course_id,
          section,
          courses (
            id,
            course_code,
            course_name
          )
        )
      `)
      .eq('id', student_id)
      .maybeSingle()

    if (studentError || !student) {
      console.error('❌ [API] ไม่พบนักศึกษา:', studentError)
      return NextResponse.json({ 
        error: 'ไม่พบข้อมูลนักศึกษา',
        debug: { student_id, studentError }
      }, { status: 404 })
    }

    console.log('👤 [API] พบนักศึกษา:', student.full_name)

    // 2. ดึง course IDs และ section ของนักศึกษาในแต่ละวิชา
    const enrollments = student.course_enrollments || []
    console.log('📚 [API] จำนวน enrollment:', enrollments.length)
    
    const enrolledCourseIds: string[] = []
    const studentSections: Record<string, string> = {} // course_id -> section
    
    for (const ce of enrollments) {
      if (ce?.course_id) {
        enrolledCourseIds.push(ce.course_id)
        if (ce.section) {
          studentSections[ce.course_id] = ce.section
        }
      }
    }

    console.log('📚 [API] Course IDs ที่ลงทะเบียน:', enrolledCourseIds)
    console.log('📚 [API] Student Sections:', studentSections)

    if (enrolledCourseIds.length === 0) {
      console.log('⚠️ [API] นักศึกษาไม่ได้ลงทะเบียนวิชาใดเลย')
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

    // 3. ดึงข้อสอบที่ active
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
    console.log('📝 [API] Exam IDs:', examIds)

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

    // 5. ⭐ กรอง sessions ตาม target_sections และ section ของนักศึกษา
    const filteredSessions = (sessions || []).filter((session: any) => {
      const targetSections = session.target_sections || []
      const sessionSection = session.section
      const exam = exams.find(e => e.id === session.exam_id)
      const studentSection = exam ? studentSections[exam.course_id] : null

      console.log(`🔍 [Filter Session] "${session.title}":`, {
        target_sections: targetSections,
        session_section: sessionSection,
        student_section: studentSection,
      })

      // ถ้า target_sections มี "*" → ใช้ได้ทุก section
      if (targetSections.includes('*')) {
        console.log('  ✅ → ใช้ได้ทุก section (wildcard *)')
        return true
      }

      // ถ้า session มี section → ใช้ได้เฉพาะ section นั้น
      if (sessionSection && sessionSection === studentSection) {
        console.log(`  ✅ → ตรงกับ section ของนักศึกษา (${studentSection})`)
        return true
      }

      // ถ้า target_sections มี section ของนักศึกษา → ใช้ได้
      if (studentSection && targetSections.includes(studentSection)) {
        console.log(`  ✅ → target_sections มี section ของนักศึกษา (${studentSection})`)
        return true
      }

      // ถ้าไม่มี target_sections และไม่มี section → ใช้ได้ทุก section
      if (targetSections.length === 0 && !sessionSection) {
        console.log('  ✅ → ไม่มี target_sections และ section (ใช้ทุก section)')
        return true
      }

      console.log('  ❌ → ไม่ตรงกับ section ของนักศึกษา')
      return false
    })

    console.log('📅 [API] Sessions ที่กรองแล้ว:', filteredSessions.length)

    // 6. ตรวจสอบจำนวนครั้งที่ทำไปแล้ว
    const sessionIds = filteredSessions.map((s: any) => s.id)
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

    // 7. เพิ่มข้อมูล attempts_remaining ให้แต่ละ session
    const sessionsWithAttempts = filteredSessions.map((session: any) => {
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

    // 8. ส่ง exams ที่มี sessions ทั้งหมดกลับมา
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