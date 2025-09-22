"use client"

import { useState, useEffect, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { 
  ArrowLeft, 
  User, 
  Calendar, 
  Phone, 
  Mail, 
  FileText, 
  Activity, 
  Brain,
  Download,
  Eye,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle,
  ExternalLink,
  Star
} from "lucide-react"

interface Detection {
  label: string
  score: number
  bbox?: number[]
}

interface Triage {
  level: "RED" | "AMBER" | "GREEN" | string
  bodyPart: string
  detections: Detection[]
  recommendations: string[]
}

interface Study {
  id: string
  studyNumber: number
  date: string
  filename: string
  processingMode: string
  bodyPart: string
  symptoms: string
  notes: string
  triage: Triage
  images: {
    original?: string
    annotated?: string
  }
  patientSummary?: string
  confidenceScore?: number
  processingTime?: number
  pdfReport?: {
    filename: string
    sizeBytes: number
  }
}

interface Patient {
  patientId: string
  name: string
  age?: number
  gender?: string
  mrn?: string
  phone?: string
  email?: string
  dob?: string
  additional?: string
}

type Params = { patientId: string }

export default function PatientDetailsPage() {
  const router = useRouter()
  const params = useParams<Params>()
  const patientId = useMemo(() => params?.patientId ?? "", [params])

  const [patient, setPatient] = useState<Patient | null>(null)
  const [studies, setStudies] = useState<Study[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false)
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null)

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId) return
      try {
        setLoading(true)
        setError("")
        const response = await fetch(`/api/patients/${encodeURIComponent(patientId)}`)
        if (!response.ok) {
          const msg = `Failed to fetch patient details (HTTP ${response.status})`
          setError(msg)
          setLoading(false)
          return
        }
        const data = await response.json() as {
          success: boolean
          patient?: Patient
          studies?: Study[]
          error?: string
        }
        if (data.success && data.patient) {
          setPatient(data.patient)
          setStudies(Array.isArray(data.studies) ? data.studies : [])
        } else {
          setError(data.error || "Failed to fetch patient details")
        }
      } catch (err) {
        console.error("Error fetching patient details:", err)
        setError("Failed to fetch patient details")
      } finally {
        setLoading(false)
      }
    }

    fetchPatientDetails()
  }, [patientId])

  const getTriageBadge = (level?: string) => {
    const variants: Record<string, string> = {
      RED: "bg-red-100 text-red-800 border-red-200",
      AMBER: "bg-yellow-100 text-yellow-800 border-yellow-200",
      GREEN: "bg-green-100 text-green-800 border-green-200",
    }
    const cls = variants[level ?? ""] ?? "bg-gray-100 text-gray-800 border-gray-200"
    const label = level ? `${level} Priority` : "Unknown Priority"
    return (
      <Badge className={`${cls} border`}>
        {label}
      </Badge>
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—"
    const d = new Date(dateString)
    if (Number.isNaN(d.getTime())) return dateString
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleAIAnalysis = async () => {
    try {
      setAiAnalysisLoading(true)
      setAiAnalysisResult(null)
      setError("")

      const payload = {
        patientId,
        studies: studies.map((study) => ({
          id: study.id,
          date: study.date,
          bodyPart: study.bodyPart,
          symptoms: study.symptoms,
          triage: study.triage,
          patientSummary: study.patientSummary,
          recommendations: study.triage?.recommendations ?? [],
        })),
      }

      const response = await fetch("/api/ai-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        setError(`Failed to generate AI analysis (HTTP ${response.status})`)
        return
      }

      const data = await response.json() as {
        success: boolean
        analysis?: string
      }

      if (data.success && typeof data.analysis === "string") {
        setAiAnalysisResult(data.analysis)
      } else {
        setError("Failed to generate AI analysis")
      }
    } catch (err) {
      console.error("Error generating AI analysis:", err)
      setError("Failed to generate AI analysis")
    } finally {
      setAiAnalysisLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading patient details...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => router.back()}>Go Back</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const normalCount = studies.filter((s) => s.triage?.level === "GREEN").length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-white/50 backdrop-blur-sm transition-all duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Patient Records
          </Button>
        
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Patient #{patient?.patientId ?? "—"}
              </h1>
              <p className="text-gray-600 mt-2 text-lg">
                Complete medical history and diagnostic studies
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Patient Information */}
          <div className="lg:col-span-1">
            <Card className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="text-center pb-2">
                <div className="relative mx-auto mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 p-1">
                    <div className="w-full h-full rounded-full bg-white flex items-center justify-center">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white flex items-center justify-center">
                    <div className="w-3 h-3 bg-white rounded-full"></div>
                  </div>
                </div>
                <CardTitle className="text-xl font-bold">
                  {patient?.name || `Patient ${patient?.patientId ?? ""}`}
                </CardTitle>
                <CardDescription className="text-base">
                  {patient?.age && patient?.gender
                    ? `${patient.age} years • ${patient.gender.charAt(0).toUpperCase()}${patient.gender.slice(1)}`
                    : "Patient Information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center border border-blue-200">
                    <div className="text-2xl font-bold text-blue-600">{studies.length}</div>
                    <div className="text-sm text-blue-700">Studies</div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center border border-green-200">
                    <div className="text-2xl font-bold text-green-600">
                      {normalCount}
                    </div>
                    <div className="text-sm text-green-700">Normal</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  {!!patient?.mrn && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FileText className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Medical Record</div>
                        <div className="text-sm text-gray-600">{patient.mrn}</div>
                      </div>
                    </div>
                  )}
                  
                  {!!patient?.phone && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                        <Phone className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Phone</div>
                        <div className="text-sm text-gray-600">{patient.phone}</div>
                      </div>
                    </div>
                  )}
                  
                  {!!patient?.email && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Mail className="h-4 w-4 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Email</div>
                        <div className="text-sm text-gray-600 break-all">{patient.email}</div>
                      </div>
                    </div>
                  )}
                  
                  {!!patient?.dob && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/50">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">Date of Birth</div>
                        <div className="text-sm text-gray-600">{formatDate(patient.dob)}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {!!patient?.additional && (
                  <>
                    <Separator />
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="h-3 w-3 text-amber-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-amber-800">Additional Notes</div>
                          <p className="text-sm text-amber-700 mt-1">{patient.additional}</p>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Studies List */}
          <div className="lg:col-span-2">
            <Card className="rounded-2xl bg-white/70 backdrop-blur-sm border border-white/20 shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-2xl">
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Diagnostic Studies ({studies.length})
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Complete history of diagnostic studies and reports
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <div className="relative">
                  {/* Timeline line */}
                  {studies.length > 1 && (
                    <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-gradient-to-b from-blue-200 to-cyan-200"></div>
                  )}
                  
                  <div className="space-y-8">
                    {studies.map((study) => {
                      const triage = study.triage ?? { level: "", bodyPart: "", detections: [], recommendations: [] }
                      const detections = Array.isArray(triage.detections) ? triage.detections : []
                      const recommendations = Array.isArray(triage.recommendations) ? triage.recommendations : []

                      return (
                        <div key={study.id} className="relative">
                          {/* Timeline dot */}
                          <div className="absolute left-4 top-6 w-4 h-4 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full border-4 border-white shadow-lg z-10"></div>
                          
                          {/* Study card */}
                          <Card className="ml-12 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 bg-white/80 backdrop-blur-sm">
                            <CardHeader className="pb-4">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-xl font-bold text-gray-800">
                                    {`Study #${study.studyNumber ?? "—"}`}
                                  </CardTitle>
                                  <CardDescription className="text-base font-medium text-gray-600">
                                    {formatDate(study.date)}
                                  </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                  {getTriageBadge(triage.level)}
                                </div>
                              </div>
                            </CardHeader>
                            
                            <CardContent className="space-y-6">
                              {/* Study Details */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                      <Activity className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="font-semibold text-blue-800 text-sm">Body Part</span>
                                  </div>
                                  <p className="text-blue-700 font-medium">{study.bodyPart || triage.bodyPart || "—"}</p>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                                      <FileText className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="font-semibold text-green-800 text-sm">Processing Mode</span>
                                  </div>
                                  <p className="text-green-700 font-medium">{study.processingMode || "—"}</p>
                                </div>
                              </div>
                              
                              {!!study.symptoms && (
                                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="h-4 w-4 text-orange-500" />
                                    <span className="font-medium text-sm text-orange-800">Symptoms</span>
                                  </div>
                                  <p className="text-sm text-orange-700">{study.symptoms}</p>
                                </div>
                              )}
                              
                              {!!study.notes && (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="h-4 w-4 text-gray-500" />
                                    <span className="font-medium text-sm text-gray-800">Clinical Notes</span>
                                  </div>
                                  <p className="text-sm text-gray-700">{study.notes}</p>
                                </div>
                              )}
                              
                              {/* Detections */}
                              {detections.length > 0 && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Activity className="h-4 w-4 text-red-500" />
                                    <span className="font-medium text-sm text-red-800">AI Detections</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {detections.map((detection, idx) => (
                                      <Badge key={idx} className="bg-red-100 text-red-800 border-red-300">
                                        {detection.label} ({(Math.max(0, Math.min(1, detection.score)) * 100).toFixed(1)}%)
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Recommendations */}
                              {recommendations.length > 0 && (
                                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-3">
                                    <CheckCircle className="h-4 w-4 text-indigo-500" />
                                    <span className="font-medium text-sm text-indigo-800">Clinical Recommendations</span>
                                  </div>
                                  <ul className="space-y-2">
                                    {recommendations.map((rec, idx) => (
                                      <li key={idx} className="flex items-start gap-2 text-sm text-indigo-700">
                                        <Star className="h-3 w-3 text-indigo-500 mt-1 flex-shrink-0" />
                                        {rec}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              
                              {/* Patient Summary */}
                              {!!study.patientSummary && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="h-4 w-4 text-purple-500" />
                                    <span className="font-medium text-sm text-purple-800">AI Summary</span>
                                  </div>
                                  <p className="text-sm text-purple-700">{study.patientSummary}</p>
                                </div>
                              )}
                              
                              {/* Actions */}
                              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                                <div className="flex items-center gap-3">
                                  {!!study.images?.original && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hover:bg-blue-50 hover:border-blue-300 transition-colors"
                                      onClick={() => {
                                        // You can swap this for your viewer route/modal
                                        window.open(study.images?.annotated || study.images.original!, "_blank")
                                      }}
                                    >
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Images
                                    </Button>
                                  )}
                                  
                                  {!!study.pdfReport && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="hover:bg-green-50 hover:border-green-300 transition-colors"
                                      onClick={() => {
                                        // Adjust to your API for fetching reports
                                        window.open(`/api/reports/${encodeURIComponent(study.pdfReport!.filename)}`, "_blank")
                                      }}
                                    >
                                      <Download className="h-4 w-4 mr-2" />
                                      Download Report
                                    </Button>
                                  )}
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="hover:bg-indigo-50 transition-colors"
                                    onClick={() => {
                                      router.push(`/patients/${encodeURIComponent(patientId)}/studies/${encodeURIComponent(study.id)}`)
                                    }}
                                  >
                                    <ExternalLink className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                </div>
                                
                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                  {typeof study.confidenceScore === "number" && (
                                    <div className="flex items-center gap-1">
                                      <CheckCircle className="h-3 w-3" />
                                      <span>Confidence: {(Math.max(0, Math.min(1, study.confidenceScore)) * 100).toFixed(1)}%</span>
                                    </div>
                                  )}
                                  {typeof study.processingTime === "number" && (
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      <span>{study.processingTime}s</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )
                    })}
                      
                      {studies.length === 0 && (
                        <div className="text-center py-12">
                          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            No studies found
                          </h3>
                          <p className="text-gray-600">
                            This patient doesn't have any completed diagnostic studies yet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* AI Analysis Section */}
          <div className="mt-8">
            <div className="text-center mb-6">
              <Button 
                onClick={handleAIAnalysis}
                disabled={aiAnalysisLoading || studies.length === 0}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 px-8 py-4 rounded-xl text-lg"
              >
                {aiAnalysisLoading ? (
                  <>
                    <Loader2 className="h-6 w-6 mr-3 animate-spin" />
                    Analyzing Patient Data...
                  </>
                ) : (
                  <>
                    <Brain className="h-6 w-6 mr-3" />
                    Generate AI Clinical Analysis
                  </>
                )}
              </Button>
              {studies.length === 0 && (
                <p className="text-gray-500 text-sm mt-2">
                  No studies available for analysis
                </p>
              )}
            </div>
            
            {/* AI Analysis Results */}
            {!!aiAnalysisResult && (
              <Card className="rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/50 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-2xl">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <Brain className="h-6 w-6" />
                    AI Clinical Analysis Report
                  </CardTitle>
                  <CardDescription className="text-purple-100 text-base">
                    Comprehensive analysis of all patient studies and medical history
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                  <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100">
                    <div className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-h4:text-lg prose-p:text-gray-700 prose-strong:text-gray-900 prose-strong:font-bold prose-ul:list-disc prose-ol:list-decimal prose-li:text-gray-700 prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:bg-blue-50 prose-blockquote:pl-4 prose-blockquote:py-2 prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-white prose-table:border prose-th:border prose-td:border prose-th:bg-gray-50 prose-th:font-semibold">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeHighlight]}
                        components={{
                          h1: ({ node, ...props }) => <h1 className="text-3xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-purple-200" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-gray-800 mb-4 mt-8 pb-2 border-b border-gray-200" {...props} />,
                          h3: ({ node, ...props }) => <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-6" {...props} />,
                          h4: ({ node, ...props }) => <h4 className="text-lg font-semibold text-gray-700 mb-2 mt-4" {...props} />,
                          p: ({ node, ...props }) => <p className="text-gray-700 mb-4 leading-relaxed" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold text-gray-900" {...props} />,
                          ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
                          li: ({ node, ...props }) => <li className="text-gray-700" {...props} />,
                          blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 bg-blue-50 pl-4 py-2 mb-4 italic" {...props} />,
                          code: (props: any) => {
                            const inline = !props.className?.includes('language-')
                            return inline 
                              ? <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono" {...props} />
                              : <code className="block bg-gray-900 text-white p-4 rounded-lg overflow-x-auto text-sm font-mono" {...props} />
                          },
                          table: ({ node, ...props }) => <table className="min-w-full border border-gray-300 mb-4" {...props} />,
                          th: ({ node, ...props }) => <th className="border border-gray-300 bg-gray-50 px-4 py-2 font-semibold text-left" {...props} />,
                          td: ({ node, ...props }) => <td className="border border-gray-300 px-4 py-2" {...props} />,
                          hr: ({ node, ...props }) => <hr className="my-8 border-t-2 border-gray-200" {...props} />,
                        }}
                      >
                        {aiAnalysisResult}
                      </ReactMarkdown>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    )
}
