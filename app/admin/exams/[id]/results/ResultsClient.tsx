'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'

export default function ResultsClient({ examId }: { examId: string }) {
  const router = useRouter()
  const [examInfo, setExamInfo] = useState<any>(null)
  const [allResults, setAllResults] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // State สำหรับตัวกรอง
  const [filterSection, setFilterSection] = useState<string>('all')
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    loadResults()
  }, [examId])

  const loadResults = async () => {
    try {
      setLoading(true)
      setError('')
      
      const res = await fetch(`/api/admin/exams/${examId}/results`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'ไม่สามารถโหลดข้อมูลได้')
      }
      
      const data = await res.json()
      setExamInfo(data.exam_info || {})
      setAllResults(data.results || [])
    } catch (err: any) {
      console.error(err)
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงข้อมูล')
    } finally {
      setLoading(false)
    }
  }

  // ตรรกะการกรองข้อมูล
  const filteredResults = useMemo(() => {
    return allResults.filter((r) => {
      if (filterSection !== 'all' && r.section !== filterSection) return false
      if (filterYear !== 'all' && r.year !== filterYear) return false
      if (filterStatus !== 'all') {
        if (filterStatus === 'passed' && !r.passed) return false
        if (filterStatus === 'failed' && r.passed) return false
      }
      return true
    })
  }, [allResults, filterSection, filterYear, filterStatus])

  // ดึงรายการที่ไม่ซ้ำกันสำหรับ Dropdown
  const sections = useMemo(() => {
    const unique = new Set(allResults.map(r => r.section).filter(Boolean))
    return Array.from(unique).sort()
  }, [allResults])

  const years = useMemo(() => {
    const unique = new Set(allResults.map(r => r.year).filter(Boolean))
    return Array.from(unique).sort()
  }, [allResults])

  // คำนวณสถิติตามข้อมูลที่กรองแล้ว
  const stats = useMemo(() => {
    const total = filteredResults.length
    const passed = filteredResults.filter(r => r.passed).length
    const failed = total - passed
    const avgScore = total > 0 ? (filteredResults.reduce((sum, r) => sum + (r.percentage || 0), 0) / total) : 0
    
    return { total, passed, failed, avgScore }
  }, [filteredResults])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📊 ภาพรวมผลการสอบ</h1>
            <p className="text-gray-600 mt-1">
              {examInfo?.title} | {examInfo?.course_code} - {examInfo?.courses?.course_name}
            </p>
          </div>
          {/* ⭐ แก้ไขตรงนี้: กลับไปหน้าหลัก /admin */}
          <button 
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition shadow-sm flex items-center gap-2"
          >
            🏠 กลับหน้าหลัก
          </button>
        </div>

        {/* Filters Panel */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">กลุ่มเรียน (Section)</label>
            <select 
              value={filterSection} 
              onChange={(e) => setFilterSection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              {sections.map(sec => (
                <option key={sec} value={sec}>{sec}</option>
              ))}
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">ชั้นปี (Year)</label>
            <select 
              value={filterYear} 
              onChange={(e) => setFilterYear(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              {years.map(yr => (
                <option key={yr} value={yr}>{yr}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">สถานะ</label>
            <select 
              value={filterStatus} 
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">ทั้งหมด</option>
              <option value="passed">ผ่าน</option>
              <option value="failed">ไม่ผ่าน</option>
            </select>
          </div>

          <button 
            onClick={() => { setFilterSection('all'); setFilterYear('all'); setFilterStatus('all'); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
          >
            🔄 ล้างตัวกรอง
          </button>
        </div>

        {/* Summary Cards (แสดงตามข้อมูลที่กรองแล้ว) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">ส่งข้อสอบแล้ว (ตามตัวกรอง)</div>
            <div className="text-3xl font-bold text-gray-900">{stats.total} คน</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">คะแนนเฉลี่ย</div>
            <div className="text-3xl font-bold text-blue-600">{stats.avgScore.toFixed(1)}%</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">สอบผ่าน</div>
            <div className="text-3xl font-bold text-green-600">{stats.passed} คน</div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="text-sm text-gray-500 mb-1">สอบไม่ผ่าน</div>
            <div className="text-3xl font-bold text-red-600">{stats.failed} คน</div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            ❌ {error}
          </div>
        )}

        {/* Student List Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">👥 รายชื่อนักศึกษาที่ส่งข้อสอบ</h3>
            <span className="text-sm text-gray-500">แสดง {filteredResults.length} จาก {allResults.length} รายการ</span>
          </div>
          
          {filteredResults.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              ไม่พบข้อมูลที่ตรงกับตัวกรอง
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">#</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">รหัสนักศึกษา</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ชื่อ-นามสกุล</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">กลุ่ม/ชั้นปี</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">คะแนน</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">สถานะ</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ส่งเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredResults.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{idx + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {r.student_code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {r.full_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.section || '-'} {r.year ? `/ ปี ${r.year}` : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">
                        {r.score ?? 0} / {r.total_score ?? 0} <span className="text-gray-400 font-normal">({r.percentage?.toFixed(1)}%)</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                          r.passed 
                            ? 'bg-green-100 text-green-800 border-green-200' 
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}>
                          {r.passed ? '✅ ผ่าน' : '❌ ไม่ผ่าน'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {r.submitted_at ? new Date(r.submitted_at).toLocaleString('th-TH', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}