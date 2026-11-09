import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { hashPassword, generateRandomPassword } from '@/lib/password'

export async function POST(request: Request) {
  try {
    const { id } = await request.json()

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const newPassword = generateRandomPassword(8)
    const hashedPassword = await hashPassword(newPassword)

    const { error } = await supabase
      .from('students')
      .update({
        password_hash: hashedPassword,
        must_change_password: true,
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, new_password: newPassword })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}