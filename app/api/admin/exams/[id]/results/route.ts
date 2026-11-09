import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงผลสอบ + สถิติแยกตามกลุ่ม
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const sectionFilter = searchParams.get('section') // ⭐ เพิ่ม: กรองตามกลุ่ม

    console.log('🔍 [API Results] examId:', examId, 'sessionId:', sessionId, 'section:', sectionFilter)

    // 1. ดึงข้อมูลข้อสอบ (เพื่อหา course_id)
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, course_id, course_code, passing_score')
      .eq('id', examId)
      .single()

    if (!exam) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 })
    }

    // 2. ดึง Sessions ทั้งหมดของข้อสอบนี้
    const { data: sessions, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id, title')
      .eq('exam_id', examId)

    if (sessionError) throw sessionError

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ attempts: [], sessions: [], sectionStats: [], exam })
    }

    const sessionIds = sessions.map((s: any) => s.id)

    // 3. ดึง Attempts (ผลสอบ) + ข้อมูลนักศึกษา + section
    let attemptsQuery = supabase
      .from('exam_attempts')
      .select(`
        id,
        student_id,
        started_at,
        submitted_at,
        time_used,
        score,
        total_score,
        percentage,
        passed,
        session_id,
        students(student_code, full_name)
      `)
      .in('session_id', sessionIds)
      .order('submitted_at', { ascending: false })

    if (sessionId) {
      attemptsQuery = attemptsQuery.eq('session_id', sessionId)
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery
    if (attemptsError) throw attemptsError

    // 4. ดึง section จาก course_enrollments สำหรับแต่ละ attempt
    const attemptsWithSection = []
    for (const attempt of attempts || []) {
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('section')
        .eq('student_id', attempt.student_id)
        .eq('course_id', exam.course_id)
        .maybeSingle()

      const section = enrollment?.section || '-'
      
      // ถ้ามีการกรองตามกลุ่ม ให้ข้ามอันที่ไม่ตรง
      if (sectionFilter && section !== sectionFilter) continue

      attemptsWithSection.push({
        ...attempt,
        section,
      })
    }

    // 5. ⭐ คำนวณสถิติแยกตามกลุ่ม (Section Stats)
    const sectionStatsMap = new Map<string, {
      section: string
      totalStudents: number
      scores: number[]
      percentages: number[]
      passedCount: number
    }>()

    // ดึงรายชื่อนักศึกษาทั้งหมดที่ลงทะเบียนวิชานี้ (เพื่อรู้ว่ามีกี่กลุ่ม)
    const { data: allEnrollments } = await supabase
      .from('course_enrollments')
      .select('student_id, section')
      .eq('course_id', exam.course_id)

    const allSections = [...new Set(allEnrollments?.map(e => e.section) || [])]

    // คำนวณสถิติจาก attempts ที่มี
    for (const attempt of attemptsWithSection) {
      const section = attempt.section
      if (!sectionStatsMap.has(section)) {
        sectionStatsMap.set(section, {
          section,
          totalStudents: 0,
          scores: [],
          percentages: [],
          passedCount: 0,
        })
      }
      const stat = sectionStatsMap.get(section)!
      stat.totalStudents++
      stat.scores.push(parseFloat(attempt.score) || 0)
      stat.percentages.push(parseFloat(attempt.percentage) || 0)
      if (attempt.passed) stat.passedCount++
    }

    // แปลงเป็น array และคำนวณค่าเฉลี่ย/สูงสุด/ต่ำสุด
    const sectionStats = allSections.map(section => {
      const stat = sectionStatsMap.get(section)
      if (!stat) {
        return {
          section,
          totalStudents: 0,
          avgScore: 0,
          avgPercentage: 0,
          passedCount: 0,
          passRate: 0,
          maxScore: 0,
          minScore: 0,
        }
      }

      const avgScore = stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length
      const avgPercentage = stat.percentages.reduce((a, b) => a + b, 0) / stat.percentages.length
      const maxScore = Math.max(...stat.scores)
      const minScore = Math.min(...stat.scores)
      const passRate = (stat.passedCount / stat.totalStudents) * 100

      return {
        section,
        totalStudents: stat.totalStudents,
        avgScore: Math.round(avgScore * 100) / 100,
        avgPercentage: Math.round(avgPercentage * 100) / 100,
        passedCount: stat.passedCount,
        passRate: Math.round(passRate * 10) / 10,
        maxScore,
        minScore,
      }
    }).sort((a, b) => a.section.localeCompare(b.section))

    console.log('📊 [API Results] Section Stats:', sectionStats)

    return NextResponse.json({ 
      attempts: attemptsWithSection, 
      sessions: sessions,
      sectionStats,
      exam,
    })
  } catch (error: any) {
    console.error('Get results error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}