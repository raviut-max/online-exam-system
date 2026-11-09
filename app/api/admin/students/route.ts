import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword, generateRandomPassword } from '@/lib/password'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ==========================================
// GET: ดึงรายชื่อนักศึกษา (รองรับ Filter)
// ==========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const section = searchParams.get('section') || ''
    const year = searchParams.get('year') || ''
    const courseCode = searchParams.get('course_code') || ''

    // 1. ดึงข้อมูลนักศึกษา
    let query = supabase.from('students').select('*')

    if (search) {
      query = query.or(`student_code.ilike.%${search}%,full_name.ilike.%${search}%`)
    }

    if (year) {
      query = query.eq('year', parseInt(year))
    }

    query = query.order('student_code', { ascending: true })

    const { data: students, error } = await query

    if (error) throw error
    if (!students) return NextResponse.json({ students: [], total: 0 })

    // 2. ดึงข้อมูลการลงทะเบียน
    const studentIds = students.map((s: any) => s.id)
    
    let enrollments: any[] = []
    if (studentIds.length > 0) {
      let enrollQuery = supabase
        .from('course_enrollments')
        .select('student_id, section, course_id, courses(course_code, course_name)')
        .in('student_id', studentIds)

      if (courseCode) {
        enrollQuery = enrollQuery.eq('courses.course_code', courseCode)
      }
      
      const { data } = await enrollQuery
      enrollments = data || []
    }

    // 3. รวมข้อมูล Section (กรองเฉพาะ enrollment ที่ valid)
    const studentsWithSection = students.map((student: any) => {
      const studentEnrollments = enrollments.filter((e: any) => e.student_id === student.id)
      
      // ⭐ กรองเฉพาะ enrollment ที่มี course_code จริง
      const validEnrollments = studentEnrollments.filter((e: any) => 
        e.courses && e.courses.course_code
      )
      
      const sectionText = validEnrollments.length > 0
        ? validEnrollments.map((e: any) => `${e.courses.course_code}/${e.section}`).join(', ')
        : '-'

      const courseText = validEnrollments.length > 0
        ? validEnrollments.map((e: any) => e.courses.course_code).join(', ')
        : '-'

      return {
        ...student,
        section: sectionText,
        courses: courseText,
        enrollmentCount: validEnrollments.length,
      }
    })

    // 4. กรองตาม Section
    let filteredStudents = studentsWithSection
    if (section) {
      filteredStudents = studentsWithSection.filter((s: any) => 
        s.section.includes(section)
      )
    }

    // 5. กรองตาม Course Code
    if (courseCode) {
      filteredStudents = filteredStudents.filter((s: any) => 
        s.courses.includes(courseCode)
      )
    }

    return NextResponse.json({ 
      students: filteredStudents,
      total: filteredStudents.length,
      allTotal: students.length
    })
  } catch (error: any) {
    console.error('GET students error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==========================================
// POST: เพิ่มหรืออัพเดทนักศึกษา
// ==========================================
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { student_code, full_name, department, year } = body

    if (!student_code || !full_name) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสนักศึกษาและชื่อ' }, { status: 400 })
    }

    const { data: existingStudent } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', student_code)
      .maybeSingle()

    if (existingStudent) {
      const { data, error } = await supabase
        .from('students')
        .update({
          full_name: full_name,
          department: department || 'วิศวกรรมคอมพิวเตอร์',
          year: year || 1,
          updated_at: new Date().toISOString(),
        })
        .eq('student_code', student_code)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({ 
        success: true, 
        action: 'updated',
        message: 'อัพเดทข้อมูลนักศึกษาแล้ว',
        student: data 
      })
    }

    const defaultPassword = generateRandomPassword(8)
    const hashedPassword = await hashPassword(defaultPassword)

    const { data, error } = await supabase
      .from('students')
      .insert([{
        student_code,
        full_name,
        department: department || 'วิศวกรรมคอมพิวเตอร์',
        year: year || 1,
        password_hash: hashedPassword,
        must_change_password: true,
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'รหัสนักศึกษานี้มีอยู่แล้ว' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true, 
      action: 'created',
      message: 'เพิ่มนักศึกษาใหม่สำเร็จ',
      student: data,
      default_password: defaultPassword 
    })

  } catch (error: any) {
    console.error('POST students error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// ==========================================
// DELETE: ลบนักศึกษา
// ==========================================
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID ของนักศึกษา' }, { status: 400 })
    }

    const { error } = await supabase
      .from('students')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'ลบนักศึกษาสำเร็จ' })
  } catch (error: any) {
    console.error('DELETE students error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}