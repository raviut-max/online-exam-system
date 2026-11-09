import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: ดึงโจทย์ทั้งหมดของข้อสอบชุดหนึ่ง
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const examId = searchParams.get('exam_id')

    if (!examId) {
      return NextResponse.json({ error: 'ต้องระบุ exam_id' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_number', { ascending: true })

    if (error) throw error

    return NextResponse.json({ questions: data || [] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: เพิ่มโจทย์ใหม่
export async function POST(request: Request) {
  try {
    const {
      exam_id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      order_number,
    } = await request.json()

    if (!exam_id || !question_text || !correct_answer) {
      return NextResponse.json({ 
        error: 'กรุณากรอกข้อมูลให้ครบ (ข้อสอบ, โจทย์, คำตอบที่ถูก)' 
      }, { status: 400 })
    }

    // หา order_number อัตโนมัติถ้าไม่ได้ส่งมา
    let finalOrder = order_number
    if (!finalOrder) {
      const { data: lastQuestion } = await supabase
        .from('questions')
        .select('order_number')
        .eq('exam_id', exam_id)
        .order('order_number', { ascending: false })
        .limit(1)
        .single()
      
      finalOrder = lastQuestion ? lastQuestion.order_number + 1 : 1
    }

    const { data, error } = await supabase
      .from('questions')
      .insert([{
        exam_id,
        question_text,
        option_a: option_a || '',
        option_b: option_b || '',
        option_c: option_c || '',
        option_d: option_d || '',
        correct_answer: correct_answer.toUpperCase(),
        points: points || 1,
        order_number: finalOrder,
      }])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, question: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT: แก้ไขโจทย์
export async function PUT(request: Request) {
  try {
    const {
      id,
      question_text,
      option_a,
      option_b,
      option_c,
      option_d,
      correct_answer,
      points,
      order_number,
    } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID โจทย์' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('questions')
      .update({
        question_text,
        option_a,
        option_b,
        option_c,
        option_d,
        correct_answer: correct_answer.toUpperCase(),
        points,
        order_number,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, question: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE: ลบโจทย์
export async function DELETE(request: Request) {
  try {
    const { id } = await request.json()

    if (!id) {
      return NextResponse.json({ error: 'ไม่พบ ID โจทย์' }, { status: 400 })
    }

    const { error } = await supabase
      .from('questions')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
