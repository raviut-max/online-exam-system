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

// POST: สร้างวิชาใหม่ (เช็ค duplicate เฉพาะ course_code)
export async function POST(request: Request) {
  try {
    const { course_code, course_name, semester, teacher_name, section } = await request.json()
    const sectionValue = section || '001'

    console.log('🔍 [Courses API] ค้นหาวิชา:', { course_code, section: sectionValue })

    // ⭐ เปลี่ยน: เช็คเฉพาะ course_code (ไม่รวม section)
    const { data: existing, error: queryError } = await supabase
      .from('courses')
      .select('id, course_code, course_name, section, semester')
      .eq('course_code', course_code)
      .maybeSingle()

    if (queryError) {
      console.error('❌ [Courses API] Query error:', queryError)
      return NextResponse.json({ error: 'เกิดข้อผิดพลาดในการค้นหาวิชา' }, { status: 500 })
    }

    // ⭐ ถ้ามีอยู่แล้ว → return course_id เดิม
    if (existing) {
      console.log(`✅ [Courses API] พบวิชาอยู่แล้ว: ${course_code} (ID: ${existing.id})`)
      return NextResponse.json({
        success: false,
        action: 'exists',
        message: `วิชานี้มีอยู่แล้ว: ${course_code} - ${course_name}`,
        course_id: existing.id,
        course: existing,
      })
    }

    // ⭐ ยังไม่มี → สร้างใหม่
    console.log(`🆕 [Courses API] สร้างวิชาใหม่: ${course_code} Section ${sectionValue}`)
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
          message: `วิชานี้มีอยู่แล้วในฐานข้อมูล (course_code ซ้ำกัน)`,
        })
      }
      throw error
    }

    console.log(`✅ [Courses API] สร้างวิชาสำเร็จ: ${course_code} (ID: ${data.id})`)
    return NextResponse.json({
      success: true,
      action: 'created',
      message: 'สร้างวิชาใหม่สำเร็จ',
      course_id: data.id,
      course: data,
    })
  } catch (error: any) {
    console.error('💥 [Courses API] CRITICAL ERROR:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}