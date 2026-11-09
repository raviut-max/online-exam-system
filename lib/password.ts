import bcrypt from 'bcryptjs'

// ฟังก์ชันเข้ารหัสรหัสผ่าน
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// ฟังก์ชันตรวจสอบรหัสผ่าน
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ฟังก์ชันสร้างรหัสผ่านสุ่ม (สำหรับ Admin แจกให้นักศึกษา)
export function generateRandomPassword(length: number = 8): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}