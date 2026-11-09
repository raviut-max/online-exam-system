import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงข้อมูล session เดียว
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: examId, sessionId } = await params

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('exam_id', examId)
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'ไม่พบรอบสอบ' }, { status: 404 })
    }

    return NextResponse.json({ session })
  } catch (error: any) {
    console.error('❌ [Get Session] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PATCH: อัพเดท session (เปิด/ปิด)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: examId, sessionId } = await params
    const { is_active, title, start_time, end_time, max_attempts_override } = await request.json()

    const updateData: any = {}
    if (is_active !== undefined) updateData.is_active = is_active
    if (title !== undefined) updateData.title = title
    if (start_time !== undefined) updateData.start_time = new Date(start_time).toISOString()
    if (end_time !== undefined) updateData.end_time = new Date(end_time).toISOString()
    if (max_attempts_override !== undefined) updateData.max_attempts_override = max_attempts_override

    const { data: session, error } = await supabase
      .from('exam_sessions')
      .update(updateData)
      .eq('id', sessionId)
      .eq('exam_id', examId)
      .select()
      .single()

    if (error || !session) {
      return NextResponse.json({ error: 'ไม่สามารถอัพเดทรอบสอบได้' }, { status: 500 })
    }

    return NextResponse.json({ success: true, session })
  } catch (error: any) {
    console.error('❌ [Update Session] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: ลบ session (พร้อมลบ attempts ที่เกี่ยวข้อง)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: examId, sessionId } = await params

    console.log('🗑️ [Delete Session] examId:', examId, 'sessionId:', sessionId)

    // 1. ตรวจสอบว่ามี session นี้จริงไหม
    const { data: session, error: sessionError } = await supabase
      .from('exam_sessions')
      .select('id, title')
      .eq('id', sessionId)
      .eq('exam_id', examId)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'ไม่พบรอบสอบ' }, { status: 404 })
    }

    // 2. ⭐ ลบ attempts ที่เกี่ยวข้องกับ session นี้ก่อน
    const { error: attemptsError } = await supabase
      .from('exam_attempts')
      .delete()
      .eq('session_id', sessionId)

    if (attemptsError) {
      console.error('⚠️ [Delete Session] ลบ attempts ไม่สำเร็จ:', attemptsError)
    } else {
      console.log('✅ [Delete Session] ลบ attempts สำเร็จ')
    }

    // 3. ลบ session
    const { error: deleteError } = await supabase
      .from('exam_sessions')
      .delete()
      .eq('id', sessionId)

    if (deleteError) {
      console.error('❌ [Delete Session] ลบ session ไม่สำเร็จ:', deleteError)
      return NextResponse.json({ error: 'ไม่สามารถลบรอบสอบได้' }, { status: 500 })
    }

    console.log('✅ [Delete Session] ลบรอบสอบสำเร็จ:', session.title)

    return NextResponse.json({ 
      success: true, 
      message: 'ลบรอบสอบเรียบร้อยแล้ว' 
    })

  } catch (error: any) {
    console.error('❌ [Delete Session] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}