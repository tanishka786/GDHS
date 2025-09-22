"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Upload, 
  MessageSquare, 
  History, 
  FileText, 
  User, 
  Calendar,
  Activity,
  ChevronRight,
  Clock,
  Eye,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw
} from "lucide-react"
import Link from "next/link"

// Type definitions
interface PatientReport {
  id: string
  patientName: string
  patientId: string
  studyType: string
  bodyPart: string
  date: string
  status: "completed" | "pending" | "processing"
  priority: "red" | "amber" | "green"
  diagnosis: string
  confidence?: number
  triageLevel?: string
  filename?: string
}

interface ProjectFeature {
  id: string
  title: string
  description: string
  icon: any
  href: string
  bgColor: string
  bgGradient: string
  count: string
  status: string
}

interface TriageData {
  red: { today: number; week: number }
  amber: { today: number; week: number }
  green: { today: number; week: number }
}

interface DashboardStats {
  totalUploads: number
  totalChats: number
  totalReports: number
  totalPatients: number
}

interface RecentActivity {
  id: string
  date: string
  patient: string
  modality: string
  bodyPart: string
  status: string
}

export default function DashboardOverview() {
  // State management
  const [triageData, setTriageData] = useState<TriageData>({
    red: { today: 0, week: 0 },
    amber: { today: 0, week: 0 },
    green: { today: 0, week: 0 },
  })
  const [patientReports, setPatientReports] = useState<PatientReport[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalUploads: 0,
    totalChats: 0,
    totalReports: 0,
    totalPatients: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Static project features configuration (no counts yet, will be updated with API data)
  const projectFeatures: ProjectFeature[] = [
    {
      id: "upload",
      title: "Upload Studies",
      description: "Upload medical images for AI analysis",
      icon: Upload,
      href: "/dashboard/upload",
      bgColor: "bg-blue-500",
      bgGradient: "from-blue-500 to-blue-600",
      count: `${dashboardStats.totalUploads} files`,
      status: "active"
    },
    {
      id: "chat",
      title: "AI Chat",
      description: "Discuss cases with AI assistant",
      icon: MessageSquare,
      href: "/dashboard/chat",
      bgColor: "bg-green-500",
      bgGradient: "from-green-500 to-green-600",
      count: `${dashboardStats.totalChats} chats`,
      status: "active"
    },
    {
      id: "history",
      title: "Study History",
      description: "View past diagnoses and reports",
      icon: History,
      href: "/dashboard/history",
      bgColor: "bg-purple-500",
      bgGradient: "from-purple-500 to-purple-600",
      count: `${dashboardStats.totalUploads} studies`,
      status: "active"
    },
    {
      id: "reports",
      title: "Reports",
      description: "Generate and manage reports",
      icon: FileText,
      href: "/dashboard/reports",
      bgColor: "bg-orange-500",
      bgGradient: "from-orange-500 to-orange-600",
      count: `${dashboardStats.totalReports} reports`,
      status: "active"
    }
  ]

  // API fetch functions
  const fetchDashboardStats = async (): Promise<DashboardStats> => {
    try {
      const response = await fetch('/api/user/analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      const data = await response.json()
      
      return {
        totalUploads: data.totalUploads || 0,
        totalChats: data.totalChats || 0,
        totalReports: data.completedUploads || 0,
        totalPatients: data.totalPatients || 0
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  }

  const fetchTriageData = async (): Promise<TriageData> => {
    try {
      const response = await fetch('/api/user/analytics')
      if (!response.ok) {
        throw new Error('Failed to fetch triage data')
      }
      const data = await response.json()
      
      const triageStats = data.triageStats || {}
      
      return {
        red: { 
          today: triageStats.RED?.today || 0, 
          week: triageStats.RED?.total || 0 
        },
        amber: { 
          today: triageStats.AMBER?.today || 0, 
          week: triageStats.AMBER?.total || 0 
        },
        green: { 
          today: triageStats.GREEN?.today || 0, 
          week: triageStats.GREEN?.total || 0 
        },
      }
    } catch (error) {
      console.error('Error fetching triage data:', error)
      throw error
    }
  }

  const fetchPatientReports = async (): Promise<PatientReport[]> => {
    try {
      const response = await fetch('/api/user/uploads?limit=4&status=completed')
      if (!response.ok) {
        throw new Error('Failed to fetch patient reports')
      }
      const data = await response.json()
      
      return data.uploads?.map((upload: any) => ({
        id: upload._id,
        patientName: upload.patientInfo?.name || 'Unknown Patient',
        patientId: upload.patientInfo?.patientId || upload.patientInfo?.mrn || 'N/A',
        studyType: upload.analysisResult?.triage?.modality || 'Medical Analysis',
        bodyPart: upload.analysisResult?.triage?.body_part || 'Unknown',
        date: new Date(upload.createdAt).toLocaleDateString(),
        status: upload.status === 'completed' ? 'completed' : 'pending',
        priority: upload.analysisResult?.triage?.level?.toLowerCase() || 'green',
        diagnosis: upload.analysisResult?.triage?.summary || 'Analysis completed',
        confidence: upload.analysisResult?.triage?.confidence || null,
        triageLevel: upload.analysisResult?.triage?.level,
        filename: upload.filename
      })) || []
    } catch (error) {
      console.error('Error fetching patient reports:', error)
      throw error
    }
  }

  const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
    try {
      const response = await fetch('/api/user/uploads?limit=5')
      if (!response.ok) {
        throw new Error('Failed to fetch recent activity')
      }
      const data = await response.json()
      
      return data.uploads?.map((upload: any) => ({
        id: upload._id,
        date: new Date(upload.createdAt).toLocaleDateString(),
        patient: upload.patientInfo?.name || `Patient #${upload.patientInfo?.patientId || 'Unknown'}`,
        modality: upload.analysisResult?.triage?.modality || 'Medical Image',
        bodyPart: upload.analysisResult?.triage?.body_part || 'Unknown',
        status: upload.analysisResult?.triage?.level?.toLowerCase() || 'green'
      })) || []
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      throw error
    }
  }

  // Load all dashboard data
  const loadDashboardData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const [stats, triage, reports, activity] = await Promise.all([
        fetchDashboardStats(),
        fetchTriageData(),
        fetchPatientReports(),
        fetchRecentActivity()
      ])
      
      setDashboardStats(stats)
      setTriageData(triage)
      setPatientReports(reports)
      setRecentActivity(activity)
    } catch (err) {
      console.error('Error loading dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Load data on component mount
  useEffect(() => {
    loadDashboardData()
  }, [])

  const getStatusBadge = (status: string) => {
    const variants = {
      red: "bg-red-100 text-red-800",
      amber: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
    }
    return <Badge className={variants[status as keyof typeof variants]}>{status.toUpperCase()}</Badge>
  }

  const getReportStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800",
    }
    return <Badge className={variants[status as keyof typeof variants]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      red: "text-red-600",
      amber: "text-yellow-600", 
      green: "text-green-600",
    }
    return colors[priority as keyof typeof colors] || "text-gray-600"
  }

  return (
    <div className="p-6 space-y-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
            <p className="text-gray-600 mt-2">Monitor your diagnostic workflow and recent activity</p>
          </div>
          <Button
            onClick={loadDashboardData}
            disabled={loading}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="border-red-200 bg-red-50 mb-6">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="flex items-center justify-between text-red-700">
            {error}
            <Button onClick={loadDashboardData} variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-100">
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="space-y-8">
          {/* Loading skeleton for features grid */}
          <div>
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-12 w-12 rounded-xl" />
                      <Skeleton className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Skeleton className="h-6 w-32 mb-2" />
                    <Skeleton className="h-4 w-full mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-5 w-16 rounded-full" />
                      <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Loading skeleton for patient reports */}
          <div>
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Card key={i} className="border-0 shadow-md">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-6 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Skeleton className="h-5 w-20 rounded-full" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full rounded-xl mb-4" />
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Loading skeleton for triage summary */}
          <div>
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl">
                  <CardHeader>
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Project Features Grid - 4 columns */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <div className="w-1 h-6 bg-blue-500 rounded-full"></div>
              My Projects
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {projectFeatures.map((feature) => {
                const IconComponent = feature.icon
                return (
                  <Link key={feature.id} href={feature.href}>
                    <Card className="relative overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group border-0 shadow-md">
                      <div className={`absolute inset-0 bg-gradient-to-br ${feature.bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className={`p-3 rounded-xl bg-gradient-to-br ${feature.bgGradient} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-gray-700 transition-colors">{feature.title}</h3>
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{feature.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-full">{feature.count}</span>
                          <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">
                            {feature.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Patient Reports Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <div className="w-1 h-6 bg-green-500 rounded-full"></div>
                Patient Reports
              </h2>
              <Button variant="outline" size="sm" asChild className="hover:bg-blue-50 hover:border-blue-300 transition-colors">
                <Link href="/dashboard/reports">View All Reports</Link>
              </Button>
            </div>
            {patientReports.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {patientReports.map((report) => (
                  <Card key={report.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md group">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {report.patientName}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-2 text-sm">
                            <User className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{report.patientId}</span>
                            <span className="text-gray-400">•</span>
                            <span>{report.studyType}</span>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {getReportStatusBadge(report.status)}
                          <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                            report.priority === 'red' ? 'bg-red-100 text-red-700' :
                            report.priority === 'amber' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {report.priority.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center gap-6 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Activity className="h-4 w-4 text-purple-500" />
                            <span className="font-medium">{report.bodyPart}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-blue-500" />
                            <span>{report.date}</span>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
                          <p className="text-sm font-semibold text-gray-700 mb-2">AI Diagnosis:</p>
                          <p className="text-sm text-gray-900 leading-relaxed">{report.diagnosis}</p>
                          {report.confidence && (
                            <div className="flex items-center gap-3 mt-3">
                              <span className="text-xs font-medium text-gray-600">Confidence:</span>
                              <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full transition-all duration-500 ${
                                    report.confidence >= 90 ? 'bg-green-500' :
                                    report.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${report.confidence}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-gray-800 min-w-[40px]">{report.confidence}%</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                          <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                            <Eye className="h-4 w-4" />
                            View Report
                          </Button>
                          <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100 transition-colors">
                            <Download className="h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="rounded-2xl">
                <CardContent className="text-center py-12">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Available</h3>
                  <p className="text-gray-600 mb-4">Upload medical images to generate patient reports.</p>
                  <Button asChild>
                    <Link href="/dashboard/upload">Upload Study</Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Triage Summary Cards */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Triage Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Red Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-red-600">{triageData.red.today}</span>
                    <span className="text-sm text-gray-500">today</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{triageData.red.week} this week</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Amber Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-yellow-600">{triageData.amber.today}</span>
                    <span className="text-sm text-gray-500">today</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{triageData.amber.week} this week</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-gray-600">Green Priority</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline space-x-2">
                    <span className="text-2xl font-bold text-green-600">{triageData.green.today}</span>
                    <span className="text-sm text-gray-500">today</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{triageData.green.week} this week</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Recent Activity */}
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest diagnostic studies and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Patient/ID</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Modality</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Body Part</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentActivity.map((activity) => (
                        <tr key={activity.id} className="border-b border-gray-100">
                          <td className="py-3 px-4 text-sm text-gray-900">{activity.date}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{activity.patient}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{activity.modality}</td>
                          <td className="py-3 px-4 text-sm text-gray-900">{activity.bodyPart}</td>
                          <td className="py-3 px-4">{getStatusBadge(activity.status)}</td>
                          <td className="py-3 px-4">
                            <Button variant="outline" size="sm">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="w-12 h-12 text-gray-400 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No studies yet</h3>
                  <p className="text-gray-600 mb-4">Upload an image to get started with your first diagnostic study.</p>
                  <Button asChild>
                    <Link href="/dashboard/upload">Upload Study</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <div className="w-1 h-6 bg-green-500 rounded-full"></div>
            Patient Reports
          </h2>
          <Button variant="outline" size="sm" asChild className="hover:bg-blue-50 hover:border-blue-300 transition-colors">
            <Link href="/dashboard/reports">View All Reports</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {patientReports.map((report) => (
            <Card key={report.id} className="hover:shadow-xl transition-all duration-300 border-0 shadow-md group">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {report.patientName}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-2 text-sm">
                      <User className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{report.patientId}</span>
                      <span className="text-gray-400">•</span>
                      <span>{report.studyType}</span>
                    </CardDescription>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {getReportStatusBadge(report.status)}
                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${
                      report.priority === 'red' ? 'bg-red-100 text-red-700' :
                      report.priority === 'amber' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {report.priority.toUpperCase()}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">{report.bodyPart}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span>{report.date}</span>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-semibold text-gray-700 mb-2">AI Diagnosis:</p>
                    <p className="text-sm text-gray-900 leading-relaxed">{report.diagnosis}</p>
                    {report.confidence && (
                      <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs font-medium text-gray-600">Confidence:</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-500 ${
                              report.confidence >= 90 ? 'bg-green-500' :
                              report.confidence >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${report.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-gray-800 min-w-[40px]">{report.confidence}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <Button variant="outline" size="sm" className="flex items-center gap-2 hover:bg-blue-50 hover:border-blue-300 transition-colors">
                      <Eye className="h-4 w-4" />
                      View Report
                    </Button>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:bg-gray-100 transition-colors">
                      <Download className="h-4 w-4" />
                      Download
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Triage Summary Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Triage Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Red Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-red-600">{triageData.red.today}</span>
                <span className="text-sm text-gray-500">today</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{triageData.red.week} this week</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Amber Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-yellow-600">{triageData.amber.today}</span>
                <span className="text-sm text-gray-500">today</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{triageData.amber.week} this week</p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-gray-600">Green Priority</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-green-600">{triageData.green.today}</span>
                <span className="text-sm text-gray-500">today</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">{triageData.green.week} this week</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest diagnostic studies and their current status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Patient/ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Modality</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Body Part</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((activity) => (
                    <tr key={activity.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm text-gray-900">{activity.date}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{activity.patient}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{activity.modality}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{activity.bodyPart}</td>
                      <td className="py-3 px-4">{getStatusBadge(activity.status)}</td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <svg
                className="w-12 h-12 text-gray-400 mx-auto mb-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No studies yet</h3>
              <p className="text-gray-600 mb-4">Upload an image to get started with your first diagnostic study.</p>
              <Button>Upload Study</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
