import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST: เปิด/ปิด session
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params
    const { is_active } = await request.json()

    const { data, error } = await supabase
      .from('exam_sessions')
      .update({ is_active })
      .eq('id', sessionId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, session: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}