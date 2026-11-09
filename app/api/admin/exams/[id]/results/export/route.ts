import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: Export ผลสอบเป็น Excel
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')
    const sectionFilter = searchParams.get('section') // ถ้ามี = export เฉพาะกลุ่มนี้

    // 1. ดึงข้อมูลข้อสอบ
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, course_code, passing_score, course_id')
      .eq('id', examId)
      .single()

    if (!exam) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 })
    }

    // 2. ดึง Sessions
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, title')
      .eq('exam_id', examId)

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ error: 'ไม่มีรอบสอบ' }, { status: 404 })
    }

    const sessionIds = sessions.map((s: any) => s.id)

    // 3. ดึง Attempts
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

    // 4. ดึง section และกรองตามกลุ่ม (ถ้ามี)
    const attemptsWithSection = []
    for (const attempt of attempts || []) {
      const { data: enrollment } = await supabase
        .from('course_enrollments')
        .select('section')
        .eq('student_id', attempt.student_id)
        .eq('course_id', exam.course_id)
        .maybeSingle()

      const section = enrollment?.section || '-'
      
      if (sectionFilter && section !== sectionFilter) continue

      attemptsWithSection.push({
        ...attempt,
        section,
      })
    }

    // 5. สร้าง Excel Workbook
    const workbook = XLSX.utils.book_new()

    // Sheet 1: ข้อมูลรายบุคคล
    const individualData = attemptsWithSection.map((a: any, idx: number) => {
      const session = sessions.find(s => s.id === a.session_id)
      return {
        'ลำดับ': idx + 1,
        'รหัสนักศึกษา': a.students?.student_code || '-',
        'ชื่อ-สกุล': a.students?.full_name || '-',
        'กลุ่ม': a.section,
        'รอบสอบ': session?.title || '-',
        'คะแนนที่ได้': parseFloat(a.score) || 0,
        'คะแนนเต็ม': parseFloat(a.total_score) || 0,
        'คะแนน (%)': parseFloat(a.percentage) || 0,
        'เวลาที่ใช้ (นาที)': a.time_used || 0,
        'เริ่มสอบ': a.started_at ? new Date(a.started_at).toLocaleString('th-TH') : '-',
        'ส่งข้อสอบ': a.submitted_at ? new Date(a.submitted_at).toLocaleString('th-TH') : '-',
        'สถานะ': a.passed ? 'ผ่าน' : 'ไม่ผ่าน',
      }
    })

    const individualSheet = XLSX.utils.json_to_sheet(individualData)
    XLSX.utils.book_append_sheet(workbook, individualSheet, 'ผลสอบรายบุคคล')

    // Sheet 2: สรุปแยกตามกลุ่ม
    const sectionStatsMap = new Map<string, {
      section: string
      totalStudents: number
      scores: number[]
      percentages: number[]
      passedCount: number
    }>()

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

    const sectionStatsData = Array.from(sectionStatsMap.values()).map(stat => {
      const avgScore = stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length
      const avgPercentage = stat.percentages.reduce((a, b) => a + b, 0) / stat.percentages.length
      const maxScore = Math.max(...stat.scores)
      const minScore = Math.min(...stat.scores)
      const passRate = (stat.passedCount / stat.totalStudents) * 100

      return {
        'กลุ่ม': stat.section,
        'จำนวนผู้เข้าสอบ': stat.totalStudents,
        'คะแนนเฉลี่ย': Math.round(avgScore * 100) / 100,
        '% เฉลี่ย': Math.round(avgPercentage * 100) / 100,
        'คะแนนสูงสุด': maxScore,
        'คะแนนต่ำสุด': minScore,
        'จำนวนผ่าน': stat.passedCount,
        'จำนวนไม่ผ่าน': stat.totalStudents - stat.passedCount,
        'อัตราผ่าน (%)': Math.round(passRate * 10) / 10,
      }
    }).sort((a, b) => a['กลุ่ม'].localeCompare(b['กลุ่ม']))

    const sectionStatsSheet = XLSX.utils.json_to_sheet(sectionStatsData)
    XLSX.utils.book_append_sheet(workbook, sectionStatsSheet, 'สรุปแยกตามกลุ่ม')

    // 6. สร้าง Buffer และส่งกลับ
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // ตั้งชื่อไฟล์
    const fileName = sectionFilter
      ? `${exam.course_code}_${exam.title}_กลุ่ม${sectionFilter}.xlsx`
      : `${exam.course_code}_${exam.title}_ทั้งหมด.xlsx`

    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    })

  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}