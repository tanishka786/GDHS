import { useAuth } from '@clerk/nextjs'
import { useState, useEffect } from 'react'

interface Upload {
  _id: string
  filename: string
  status: 'processing' | 'completed' | 'failed'
  createdAt: string
  analysisResult: {
    triage: {
      level: 'RED' | 'AMBER' | 'GREEN'
      body_part: string
    }
    patient_summary: string
  }
  patientInfo: {
    name: string
  }
}

interface Analytics {
  summary: {
    totalUploads: number
    completedUploads: number
    failedUploads: number
    successRate: number
  }
  triageDistribution: {
    RED: number
    AMBER: number
    GREEN: number
  }
  bodyPartDistribution: { [key: string]: number }
  recentUploads: Upload[]
}

export function UploadHistory() {
  const { isSignedIn } = useAuth()
  const [uploads, setUploads] = useState<Upload[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isSignedIn) {
      fetchUploads()
      fetchAnalytics()
    }
  }, [isSignedIn])

  const fetchUploads = async () => {
    try {
      const response = await fetch('/api/user/uploads?limit=20')
      const data = await response.json()
      
      if (data.success) {
        setUploads(data.data.uploads)
      } else {
        setError(data.error || 'Failed to fetch uploads')
      }
    } catch (err) {
      setError('Network error while fetching uploads')
    }
  }

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/user/analytics')
      const data = await response.json()
      
      if (data.success) {
        setAnalytics(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!isSignedIn) {
    return <div>Please sign in to view your upload history.</div>
  }

  if (loading) {
    return <div>Loading your upload history...</div>
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  const getTriageColor = (level: string) => {
    switch (level) {
      case 'RED': return 'text-red-600 bg-red-100'
      case 'AMBER': return 'text-yellow-600 bg-yellow-100'
      case 'GREEN': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-red-600 bg-red-100'
      case 'processing': return 'text-blue-600 bg-blue-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Total Uploads</h3>
            <p className="text-2xl font-bold text-blue-600">{analytics.summary.totalUploads}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{analytics.summary.completedUploads}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Failed</h3>
            <p className="text-2xl font-bold text-red-600">{analytics.summary.failedUploads}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900">Success Rate</h3>
            <p className="text-2xl font-bold text-purple-600">{analytics.summary.successRate}%</p>
          </div>
        </div>
      )}

      {/* Triage Distribution */}
      {analytics && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Triage Distribution</h3>
          <div className="flex space-x-4">
            <div className={`px-3 py-1 rounded-full ${getTriageColor('RED')}`}>
              RED: {analytics.triageDistribution.RED}
            </div>
            <div className={`px-3 py-1 rounded-full ${getTriageColor('AMBER')}`}>
              AMBER: {analytics.triageDistribution.AMBER}
            </div>
            <div className={`px-3 py-1 rounded-full ${getTriageColor('GREEN')}`}>
              GREEN: {analytics.triageDistribution.GREEN}
            </div>
          </div>
        </div>
      )}

      {/* Upload History */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Uploads</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  File
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Triage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Body Part
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {uploads.map((upload) => (
                <tr key={upload._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {upload.filename}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {upload.patientInfo?.name || 'Not provided'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(upload.status)}`}>
                      {upload.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {upload.status === 'completed' && upload.analysisResult ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTriageColor(upload.analysisResult.triage.level)}`}>
                        {upload.analysisResult.triage.level}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {upload.status === 'completed' && upload.analysisResult?.triage.body_part 
                      ? upload.analysisResult.triage.body_part 
                      : '-'
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(upload.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {uploads.length === 0 && (
          <div className="px-6 py-12 text-center text-gray-500">
            No uploads found. Upload your first medical image to get started.
          </div>
        )}
      </div>
    </div>
  )
}

export default UploadHistory