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
    const sectionFilter = searchParams.get('section')
    const yearFilter = searchParams.get('year')
    const statusFilter = searchParams.get('status')

    // 1. ดึงข้อมูลข้อสอบ
    const { data: exam } = await supabase
      .from('exams')
      .select('id, title, course_code, passing_score, course_id')
      .eq('id', examId)
      .single()

    if (!exam) {
      return NextResponse.json({ error: 'ไม่พบข้อสอบ' }, { status: 404 })
    }

    // 2. ดึง Sessions ของข้อสอบนี้
    const { data: sessions } = await supabase
      .from('exam_sessions')
      .select('id, title')
      .eq('exam_id', examId)

    const sessionIds = sessions?.map((s: any) => s.id) || []

    // 3. ดึง Attempts ทั้งหมด
    let attemptsQuery = supabase
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

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'passed') {
        attemptsQuery = attemptsQuery.eq('passed', true)
      } else if (statusFilter === 'failed') {
        attemptsQuery = attemptsQuery.eq('passed', false)
      }
    }

    const { data: attempts, error: attemptsError } = await attemptsQuery
      .order('submitted_at', { ascending: false })

    if (attemptsError) throw attemptsError

    // 4. ดึงข้อมูลนักศึกษาและ section
    const studentIds = [...new Set((attempts || []).map((a: any) => a.student_id))]
    let studentsMap: Record<string, any> = {}
    let enrollmentsMap: Record<string, { section: string; year: string }> = {}

    if (studentIds.length > 0) {
      // ดึงข้อมูลนักศึกษา
      const { data: students } = await supabase
        .from('students')
        .select('id, student_code, full_name, year')
        .in('id', studentIds)

      if (students) {
        students.forEach((s: any) => {
          studentsMap[s.id] = s
        })
      }

      // ดึง section และ year จาก course_enrollments
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('student_id, section')
        .eq('course_id', exam.course_id)
        .in('student_id', studentIds)

      if (enrollments) {
        enrollments.forEach((e: any) => {
          const student = studentsMap[e.student_id]
          enrollmentsMap[e.student_id] = {
            section: e.section || '-',
            year: student?.year || '-'
          }
        })
      }
    }

    // 5. กรองข้อมูลตามตัวกรอง
    const filteredAttempts = (attempts || []).filter((a: any) => {
      const enrollment = enrollmentsMap[a.student_id]
      if (!enrollment) return false

      if (sectionFilter && sectionFilter !== 'all' && enrollment.section !== sectionFilter) {
        return false
      }
      if (yearFilter && yearFilter !== 'all' && enrollment.year !== yearFilter) {
        return false
      }
      return true
    })

    // 6. สร้างข้อมูลสำหรับ Excel
    const excelData = filteredAttempts.map((a: any, idx: number) => {
      const student = studentsMap[a.student_id] || {}
      const enrollment = enrollmentsMap[a.student_id] || { section: '-', year: '-' }
      const session = sessions?.find((s: any) => s.id === a.session_id)

      return {
        'ลำดับ': idx + 1,
        'รหัสนักศึกษา': student.student_code || '-',
        'ชื่อ-นามสกุล': student.full_name || '-',
        'กลุ่ม': enrollment.section,
        'ชั้นปี': enrollment.year,
        'รอบสอบ': session?.title || '-',
        'คะแนนที่ได้': parseFloat(a.score) || 0,
        'คะแนนเต็ม': parseFloat(a.total_score) || 0,
        'คะแนน (%)': parseFloat(a.percentage) || 0,
        'เวลาที่ใช้ (นาที)': Math.floor((a.time_used || 0) / 60),
        'เริ่มสอบ': a.started_at ? new Date(a.started_at).toLocaleString('th-TH') : '-',
        'ส่งข้อสอบ': a.submitted_at ? new Date(a.submitted_at).toLocaleString('th-TH') : '-',
        'สถานะ': a.passed ? 'ผ่าน' : 'ไม่ผ่าน',
      }
    })

    // 7. สร้าง Excel Workbook
    const workbook = XLSX.utils.book_new()
    
    // Sheet 1: ข้อมูลรายบุคคล
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    
    // ตั้งค่าความกว้างคอลัมน์
    worksheet['!cols'] = [
      { wch: 5 },   // ลำดับ
      { wch: 15 },  // รหัสนักศึกษา
      { wch: 30 },  // ชื่อ-นามสกุล
      { wch: 10 },  // กลุ่ม
      { wch: 10 },  // ชั้นปี
      { wch: 20 },  // รอบสอบ
      { wch: 15 },  // คะแนนที่ได้
      { wch: 15 },  // คะแนนเต็ม
      { wch: 15 },  // คะแนน (%)
      { wch: 15 },  // เวลาที่ใช้
      { wch: 20 },  // เริ่มสอบ
      { wch: 20 },  // ส่งข้อสอบ
      { wch: 10 },  // สถานะ
    ]

    XLSX.utils.book_append_sheet(workbook, worksheet, 'ผลสอบรายบุคคล')

    // Sheet 2: สรุปสถิติ
    const sectionStatsMap = new Map<string, {
      section: string
      totalStudents: number
      scores: number[]
      percentages: number[]
      passedCount: number
    }>()

    for (const attempt of filteredAttempts) {
      const enrollment = enrollmentsMap[attempt.student_id]
      if (!enrollment) continue

      const section = enrollment.section
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
    sectionStatsSheet['!cols'] = [
      { wch: 10 }, { wch: 18 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(workbook, sectionStatsSheet, 'สรุปแยกตามกลุ่ม')

    // 8. สร้าง Buffer และส่งกลับ
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // ตั้งชื่อไฟล์
    const fileName = `${exam.course_code}_${exam.title.replace(/\s+/g, '_')}_results.xlsx`

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

// POST: ดึงข้อมูลผลการสอบ (สำหรับแสดงในหน้าเว็บ)
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
        section: enrollmentsMap[a.student_id] || 'N/A',
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