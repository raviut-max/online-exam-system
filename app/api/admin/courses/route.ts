import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงรายชื่อวิชา (ไม่ซ้ำกัน แยกตาม course_code)
export async function GET() {
  try {
    // ดึงข้อมูลทั้งหมดก่อน
    const { data: allCourses, error } = await supabase
      .from('courses')
      .select('*')
      .order('course_code')

    if (error) throw error

    // กรองให้เหลือแค่ course_code ที่ไม่ซ้ำกัน (เอาแถวแรกของแต่ละวิชา)
    const uniqueCourses: any[] = []
    const seen = new Set<string>()

    for (const course of allCourses || []) {
      if (!seen.has(course.course_code)) {
        seen.add(course.course_code)
        uniqueCourses.push(course)
      }
    }

    return NextResponse.json({ courses: uniqueCourses })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: สร้างวิชาใหม่ (เช็ค duplicate แบบรวม section)
export async function POST(request: Request) {
  try {
    const { course_code, course_name, semester, teacher_name, section } = await request.json()

    const sectionValue = section || '001'

    // 1. เช็คว่าวิชานี้ + section นี้ + semester นี้ มีอยู่แล้วไหม
    const { data: existing } = await supabase
      .from('courses')
      .select('id, course_code, section, semester')
      .eq('course_code', course_code)
      .eq('section', sectionValue)
      .eq('semester', semester)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        success: false,
        action: 'exists',
        message: `วิชานี้มีอยู่แล้ว: ${course_code} กลุ่ม ${sectionValue} ภาค ${semester}`,
        course: existing
      })
    }

    // 2. ยังไม่มี → สร้างใหม่
    const { data, error } = await supabase
      .from('courses')
      .insert([{
        course_code,
        course_name,
        section: sectionValue,
        semester: semester || '',
        teacher_name: teacher_name || '',
      }])
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ 
          success: false,
          action: 'exists',
          message: `วิชานี้มีอยู่แล้วในฐานข้อมูล (course_code + section + semester ซ้ำกัน)`
        })
      }
      throw error
    }

    return NextResponse.json({ 
      success: true,
      action: 'created',
      message: 'สร้างวิชาใหม่สำเร็จ',
      course: data 
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}