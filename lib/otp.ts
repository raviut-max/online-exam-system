// สร้างตัวเลขสุ่ม 6 หลัก
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}