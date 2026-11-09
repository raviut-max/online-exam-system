'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'

export default function ImportStudentsPage() {
  const [file, setFile] = useState<File | null>(null)
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAll, setShowAll] = useState(false)
  
  const [courseCode, setCourseCode] = useState('')
  const [courseName, setCourseName] = useState('')
  const [semester, setSemester] = useState('1')
  const [year, setYear] = useState('2569')
  const [group, setGroup] = useState('')
  const [teacher, setTeacher] = useState('')
  const [department, setDepartment] = useState('วิศวกรรมคอมพิวเตอร์')
  
  const router = useRouter()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    setFile(selectedFile)
    parseExcel(selectedFile)
  }

  const parseExcel = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        
        const jsonData: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: ''
        })

        const parsedStudents: any[] = []
        let foundCourse = false
        let headerRowFound = false
        let foundDepartment = false

        for (let i = 0; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row) continue

          const rowStr = row.map((cell: any) => String(cell || '').trim())
          
          // 1. ค้นหารหัสวิชาและชื่อวิชา
          if (!foundCourse && rowStr[0].includes('ชื่อวิชา')) {
            const match = rowStr[0].match(/([A-Z]{3,}\d{4})\s+(.+?)\s*:/)
            if (match) {
              setCourseCode(match[1])
              setCourseName(match[2].trim())
              foundCourse = true
            }
          }

          // 2. ค้นหาภาคการศึกษา
          if (rowStr[0].includes('ภาคการศึกษาที่')) {
            const match = rowStr[0].match(/ภาคการศึกษาที่\s*:\s*(\d+)\s+ปีการศึกษา\s*:\s*(\d+)/)
            if (match) {
              setSemester(match[1])
              setYear(match[2])
            }
          }

          // 3. ค้นหาชื่ออาจารย์
          if (rowStr[0].includes('ชื่อ-สกุลอาจารย์')) {
            const match = rowStr[0].match(/ชื่อ-สกุลอาจารย์\s*:\s*\d+\s*-\s*(.+)/)
            if (match) {
              setTeacher(match[1].trim())
            }
          }

          // 4. ค้นหากลุ่มเรียน
          if (rowStr[0].includes('กลุ่มเรียน')) {
            const match = rowStr[0].match(/กลุ่มเรียน\s*:\s*(\d+)/)
            if (match) {
              setGroup(match[1])
            }
          }

          // 5. ค้นหาสาขาวิชา
          if (!foundDepartment && rowStr[0].includes('สาขาวิชา')) {
            const match = rowStr[0].match(/สาขาวิชา\s*:\s*(.+)/)
            if (match && match[1].trim()) {
              setDepartment(match[1].trim())
              foundDepartment = true
              console.log('Found department:', match[1].trim())
            } else {
              // ลองเช็คคอลัมน์อื่น
              for (let j = 1; j < rowStr.length; j++) {
                if (rowStr[j] && rowStr[j].trim()) {
                  setDepartment(rowStr[j].trim())
                  foundDepartment = true
                  console.log('Found department in column', j, ':', rowStr[j].trim())
                  break
                }
              }
            }
          }

          // 6. หาแถว header
          if (!headerRowFound && rowStr[1] === 'รหัสนักศึกษา') {
            headerRowFound = true
            continue
          }

          // 7. ดึงข้อมูลนักศึกษา
          if (headerRowFound && rowStr[1]) {
            const studentCode = rowStr[1]
            const fullName = rowStr[2]
            const status = rowStr[4] || ''
            const remark = rowStr[5] || ''

            if (studentCode.match(/^\d{11}$/) && fullName) {
              parsedStudents.push({
                student_code: studentCode,
                full_name: fullName,
                status: status,
                remark: remark,
              })
            }
          }
        }

        setStudents(parsedStudents)
        setShowAll(false)
        setError('')
        
        if (parsedStudents.length === 0) {
          setError('ไม่พบข้อมูลนักศึกษาในไฟล์ กรุณาตรวจสอบรูปแบบไฟล์')
        }
      } catch (err: any) {
        console.error('Parse error:', err)
        setError(`เกิดข้อผิดพลาดในการอ่านไฟล์ Excel: ${err.message}`)
      }
    }
    reader.onerror = () => {
      setError('ไม่สามารถอ่านไฟล์ได้')
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (students.length === 0) {
      setError('ไม่มีข้อมูลนักศึกษาที่จะนำเข้า')
      return
    }

    if (!confirm(`ยืนยันการนำเข้าข้อมูลนักศึกษาทั้งหมด ${students.length} คน?\n(สาขาวิชา: ${department}, กลุ่มเรียน: ${group})`)) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // 1. สร้างวิชา (เช็ค duplicate)
      const courseRes = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          course_code: courseCode,
          course_name: courseName,
          semester: `${semester}/${year}`,
          teacher_name: teacher,
          section: group,
        }),
      })

      const courseData = await courseRes.json()
      let courseStatus = ''
      
      if (courseData.action === 'exists') {
        courseStatus = `📚 วิชา: ${courseData.message} (ใช้ข้อมูลเดิม)`
      } else if (courseData.action === 'created') {
        courseStatus = `📚 วิชา: สร้างวิชา ${courseCode} กลุ่ม ${group} ใหม่`
      }

      // 2. เพิ่ม/อัพเดทนักศึกษาและลงทะเบียน
      let createdCount = 0
      let updatedCount = 0
      let enrolledCount = 0
      let alreadyEnrolledCount = 0
      let errorCount = 0

      for (const student of students) {
        try {
          const studentRes = await fetch('/api/admin/students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              student_code: student.student_code,
              full_name: student.full_name,
              department: department,
              year: parseInt(year) - 2567,
            }),
          })

          const studentData = await studentRes.json()
          
          if (studentRes.ok) {
            if (studentData.action === 'created') {
              createdCount++
            } else if (studentData.action === 'updated') {
              updatedCount++
            }

            // ลงทะเบียนวิชา
            const enrollRes = await fetch('/api/admin/enroll', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                student_code: student.student_code,
                course_code: courseCode,
                section: group,
              }),
            })

            const enrollData = await enrollRes.json()
            
            if (enrollRes.ok) {
              if (enrollData.message === 'ลงทะเบียนแล้ว') {
                alreadyEnrolledCount++
              } else {
                enrolledCount++
              }
            }
          } else {
            errorCount++
            console.error('Failed to process student:', studentData)
          }
        } catch (err) {
          errorCount++
          console.error('Error processing student:', student.student_code, err)
        }
      }

      const msg = `
${courseStatus}

✅ เสร็จสิ้น!
🆕 เพิ่มนักศึกษาใหม่: ${createdCount} คน
🔄 อัพเดทข้อมูล: ${updatedCount} คน
📚 ลงทะเบียนใหม่: ${enrolledCount} คน
⏭️ ลงทะเบียนแล้ว: ${alreadyEnrolledCount} คน
❌ ผิดพลาด: ${errorCount} คน
      `.trim()
      
      setSuccess(msg)
      
      setTimeout(() => {
        router.push('/admin/students')
      }, 5000)

    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">📥 Import นักศึกษาจาก Excel (ISRP37)</h1>
          <button
            onClick={() => router.push('/admin/students')}
            className="text-sm text-indigo-200 hover:text-white mt-1"
          >
            ← กลับหน้าจัดการนักศึกษา
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">1. อัปโหลดไฟล์ Excel</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="excel-upload"
            />
            <label
              htmlFor="excel-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="text-blue-600 font-medium">คลิกเพื่อเลือกไฟล์ Excel</span>
              <span className="text-sm text-gray-500 mt-1">รองรับไฟล์ ISRP37 (.xlsx, .xls)</span>
            </label>
            
            {file && (
              <div className="mt-4 text-sm text-gray-600">
                📄 ไฟล์: {file.name}
              </div>
            )}
          </div>
        </div>

        {/* Course Info */}
        {students.length > 0 && (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-lg font-semibold mb-4">2. ข้อมูลวิชาและสาขา (ตรวจสอบและแก้ไขได้)</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">รหัสวิชา</label>
                  <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ชื่อวิชา</label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ภาคการศึกษา/ปี</label>
                  <input
                    type="text"
                    value={`${semester}/${year}`}
                    onChange={(e) => {
                      const [s, y] = e.target.value.split('/')
                      setSemester(s || '1')
                      setYear(y || '2569')
                    }}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">กลุ่มเรียน</label>
                  <input
                    type="text"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md bg-yellow-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    ⚠️ ถ้าจะ Import Section ใหม่ (เช่น 002) ให้แก้เป็น 002 ที่นี่
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">อาจารย์ผู้สอน</label>
                  <input
                    type="text"
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">สาขาวิชา</label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border rounded-md bg-yellow-50"
                    placeholder="เช่น วิศวกรรมคอมพิวเตอร์"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    💡 อ่านจากไฟล์ Excel อัตโนมัติ (แก้ไขได้ถ้าไม่ถูกต้อง)
                  </p>
                </div>
              </div>
            </div>

            {/* Students Preview */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">
                  3. ตัวอย่างนักศึกษา ({students.length} คน)
                </h2>
                {students.length > 20 && (
                  <button
                    type="button"
                    onClick={() => setShowAll(!showAll)}
                    className="px-4 py-2 text-sm bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 font-medium transition-colors"
                  >
                    {showAll ? '🔼 แสดงน้อยลง' : '🔽 ดูทั้งหมด'}
                  </button>
                )}
              </div>
              
              <div className="max-h-96 overflow-y-auto border rounded-md">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left">#</th>
                      <th className="px-3 py-2 text-left">รหัส</th>
                      <th className="px-3 py-2 text-left">ชื่อ-นามสกุล</th>
                      <th className="px-3 py-2 text-left">สถานะ</th>
                      <th className="px-3 py-2 text-left">หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {(showAll ? students : students.slice(0, 20)).map((s, idx) => (
                      <tr key={idx} className={s.remark === 'พ้นสภาพ' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                        <td className="px-3 py-2">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono">{s.student_code}</td>
                        <td className="px-3 py-2">{s.full_name}</td>
                        <td className="px-3 py-2">{s.status}</td>
                        <td className="px-3 py-2">
                          {s.remark === 'พ้นสภาพ' ? (
                            <span className="text-red-600 text-xs font-medium">⚠️ {s.remark}</span>
                          ) : (
                            <span className="text-green-600 text-xs">{s.remark}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!showAll && students.length > 20 && (
                <div className="mt-3 text-center text-sm text-gray-500">
                  แสดง 20 คนแรกจากทั้งหมด {students.length} คน — กดปุ่ม "🔽 ดูทั้งหมด" ด้านบนเพื่อดูทั้งหมด
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                ℹ️ ระบบจะนำเข้าข้อมูลนักศึกษา <strong>ทุกคน</strong> ในรายการ (รวมถึงผู้ที่หมายเหตุว่า "พ้นสภาพ") 
                โดยใช้สาขาวิชา: <strong>{department}</strong> และกลุ่มเรียน: <strong>{group}</strong>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium disabled:bg-green-300"
              >
                {loading ? '⏳ กำลังนำเข้า...' : '✅ นำเข้าข้อมูล'}
              </button>
              <button
                onClick={() => {
                  setFile(null)
                  setStudents([])
                  setShowAll(false)
                  setError('')
                  setSuccess('')
                }}
                className="px-6 py-3 border rounded-md hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            </div>
          </>
        )}

        {/* Messages */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-700 whitespace-pre-wrap">
            {success}
          </div>
        )}
      </main>
    </div>
  )
}