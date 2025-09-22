"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import {Component as AILoader} from "@/components/ai-loader"

export default function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [notes, setNotes] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingMode, setProcessingMode] = useState("Automatic - Full AI Pipeline")
  const [patientSymptoms, setPatientSymptoms] = useState("")
  const [bodyPartPreference, setBodyPartPreference] = useState("Auto-detect")
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [processedFilename, setProcessedFilename] = useState<string>("")
  const [showPDFPreview, setShowPDFPreview] = useState(false)
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [patientInfo, setPatientInfo] = useState({
    patientId: '',
    name: '',
    dob: '',
    age: '',
    gender: 'unknown',
    mrn: '',
    phone: '',
    email: '',
    additional: ''
  })
  const { toast } = useToast()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  const handleProcess = async () => {
    if (!selectedFile) {
      toast({
        title: "Missing Information",
        description: "Please select a file before processing.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)


    try {
      toast({
        title: "Processing Started",
        description: "Your study is being analyzed by our AI agents...",
      })

      // Create FormData for file upload
      const formData = new FormData()
      formData.append('file', selectedFile)
  // modality/bodyPart removed from UI; analysis will rely on auto-detection or preferences
      formData.append('processingMode', processingMode)
      formData.append('bodyPartPreference', bodyPartPreference)
      if (notes) {
        formData.append('notes', notes)
      }
      if (patientSymptoms) {
        formData.append('patientSymptoms', patientSymptoms)
      }

      // Add patient information to FormData
      if (patientInfo.patientId) {
        formData.append('patientId', patientInfo.patientId)
      }
      if (patientInfo.name) {
        formData.append('patientName', patientInfo.name)
      }
      if (patientInfo.dob) {
        formData.append('patientDob', patientInfo.dob)
      }
      if (patientInfo.age) {
        formData.append('patientAge', patientInfo.age)
      }
      if (patientInfo.gender && patientInfo.gender !== 'unknown') {
        formData.append('patientGender', patientInfo.gender)
      }
      if (patientInfo.mrn) {
        formData.append('patientMrn', patientInfo.mrn)
      }
      if (patientInfo.phone) {
        formData.append('patientPhone', patientInfo.phone)
      }
      if (patientInfo.email) {
        formData.append('patientEmail', patientInfo.email)
      }
      if (patientInfo.additional) {
        formData.append('patientAdditional', patientInfo.additional)
      }

      // Make API call to backend
      const response = await fetch('/api/user/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle different types of errors
        let errorMessage = 'Failed to process study'
        if (result.details?.error?.message) {
          errorMessage = result.details.error.message
        } else if (result.error) {
          errorMessage = result.error
        }
        
        if (result.support_message) {
          errorMessage += ` - ${result.support_message}`
        }
        
        throw new Error(errorMessage)
      }

      toast({
        title: "Processing Complete",
        description: "Analysis complete! View results below.",
      })

      // Debug: Log the full response structure
      console.log('Full analysis result:', result)
      console.log('Result data:', result.data)
      console.log('Cloudinary URLs:', result.data?.cloudinary_urls)

      // Store the analysis result and filename
      setAnalysisResult(result.data)
      setProcessedFilename(selectedFile.name)

      // Reset form
      setSelectedFile(null)
  // modality/bodyPart removed from UI; nothing to reset for them
      setNotes("")
      setPatientSymptoms("")
      setProcessingMode("Automatic - Full AI Pipeline")
      setBodyPartPreference("Auto-detect")

    } catch (error) {
      console.error('Processing error:', error)
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveReport = async () => {
    if (!analysisResult || !processedFilename) {
      toast({
        title: "No Data to Save",
        description: "Please complete an analysis first before saving.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)

    try {
      const response = await fetch('/api/user/save-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: processedFilename,
          processingMode,
          bodyPartPreference,
          patientSymptoms,
          notes,
          patientInfo: {
            ...patientInfo,
            age: patientInfo.age ? parseInt(patientInfo.age) : undefined
          },
          analysisResult
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Report Saved Successfully",
          description: "Your analysis report has been saved to your history.",
        })
      } else {
        toast({
          title: "Save Failed",
          description: result.message || "Failed to save the report. Please try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving report:', error)
      toast({
        title: "Save Failed",
        description: "An unexpected error occurred while saving. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDownloadPDF = () => {
    if (!analysisResult?.pdf_report?.content) {
      toast({
        title: "PDF Not Available",
        description: "No PDF report found for this analysis.",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert base64 to blob
      const base64Data = analysisResult.pdf_report.content
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      
      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = analysisResult.pdf_report.filename || `medical_report_${Date.now()}.pdf`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "PDF Downloaded",
        description: "Medical report has been downloaded successfully.",
      })
    } catch (error) {
      console.error('Error downloading PDF:', error)
      toast({
        title: "Download Failed",
        description: "Failed to download the PDF report. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handlePreviewPDF = () => {
    if (!analysisResult?.pdf_report?.content) {
      toast({
        title: "PDF Not Available",
        description: "No PDF report found for this analysis.",
        variant: "destructive",
      })
      return
    }

    try {
      // Convert base64 to blob
      const base64Data = analysisResult.pdf_report.content
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'application/pdf' })
      
      // Create blob URL for preview
      const url = window.URL.createObjectURL(blob)
      setPdfBlobUrl(url)
      setShowPDFPreview(true)
      
    } catch (error) {
      console.error('Error creating PDF preview:', error)
      toast({
        title: "Preview Failed",
        description: "Failed to preview the PDF report. Please try downloading instead.",
        variant: "destructive",
      })
    }
  }

  const closePDFPreview = () => {
    setShowPDFPreview(false)
    if (pdfBlobUrl) {
      window.URL.revokeObjectURL(pdfBlobUrl)
      setPdfBlobUrl(null)
    }
  }

  const resetPatientInfo = () => {
    setPatientInfo({
      patientId: '',
      name: '',
      dob: '',
      age: '',
      gender: 'unknown',
      mrn: '',
      phone: '',
      email: '',
      additional: ''
    })
  }

  return (
    <div className="p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Upload Study</h1>
        <p className="text-gray-600 mt-2">Upload medical images for AI-powered analysis</p>
      </div>

      <div className="max-w-2xl mx-auto">
        {/* File Upload */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle>Medical Image Upload</CardTitle>
            <CardDescription>Drag and drop your DICOM, PNG, or JPG files here</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex flex-col items-center justify-center w-full">
            <Input
              type="file"
              accept=".dcm,.png,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer"
                onDrop={handleDrop}
                onDragOver={handleDragOver}>
                {selectedFile ? (
                  <div>
                    <svg
                      className="w-12 h-12 text-green-500 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-gray-600">File ready for processing</p>
                  </div>
                ) : (
                  <div>
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
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="text-lg font-medium text-gray-900">Drop your files here</p>
                    <p className="text-gray-600">or click to browse</p>
                  </div>
                )}
              </div>
            </Label>
          </CardContent>
        </Card>

        {/* Study Details removed per request */}

        {/* Patient Information */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Patient Information
            </CardTitle>
            <CardDescription>Enter patient details for the medical record</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientId">Patient ID</Label>
                <Input
                  id="patientId"
                  value={patientInfo.patientId}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, patientId: e.target.value }))}
                  placeholder="P-123456"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="patientName">Full Name</Label>
                <Input
                  id="patientName"
                  value={patientInfo.name}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="John Doe"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="patientDob">Date of Birth</Label>
                <Input
                  id="patientDob"
                  type="date"
                  value={patientInfo.dob}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, dob: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="patientAge">Age</Label>
                <Input
                  id="patientAge"
                  type="number"
                  value={patientInfo.age}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, age: e.target.value }))}
                  placeholder="25"
                  min="0"
                  max="150"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="patientGender">Gender</Label>
                <select
                  id="patientGender"
                  value={patientInfo.gender}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, gender: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="unknown">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="patientMrn">Medical Record Number (MRN)</Label>
                <Input
                  id="patientMrn"
                  value={patientInfo.mrn}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, mrn: e.target.value }))}
                  placeholder="MRN-789012"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="patientPhone">Phone Number</Label>
                <Input
                  id="patientPhone"
                  type="tel"
                  value={patientInfo.phone}
                  onChange={(e) => setPatientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="patientEmail">Email Address</Label>
              <Input
                id="patientEmail"
                type="email"
                value={patientInfo.email}
                onChange={(e) => setPatientInfo(prev => ({ ...prev, email: e.target.value }))}
                placeholder="patient@example.com"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="patientAdditional">Additional Patient Notes</Label>
              <Textarea
                id="patientAdditional"
                value={patientInfo.additional}
                onChange={(e) => setPatientInfo(prev => ({ ...prev, additional: e.target.value }))}
                placeholder="Any additional information about the patient..."
                className="mt-1"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Analysis Configuration */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Analysis Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="processingMode">Processing Mode</Label>
              <select
                id="processingMode"
                value={processingMode}
                onChange={(e) => setProcessingMode(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Automatic - Full AI Pipeline">Automatic - Full AI Pipeline</option>
                <option value="Manual Review">Manual Review</option>
                <option value="Quick Analysis">Quick Analysis</option>
                <option value="Detailed Analysis">Detailed Analysis</option>
              </select>
            </div>

            <div>
              <Label htmlFor="patientSymptoms">Patient Symptoms</Label>
              <Textarea
                id="patientSymptoms"
                value={patientSymptoms}
                onChange={(e) => setPatientSymptoms(e.target.value)}
                placeholder="Describe pain, swelling, mechanism of injury..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div>
              <Label>Body Part Preference</Label>
              <div className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="auto-detect"
                    name="bodyPartPreference"
                    value="Auto-detect"
                    checked={bodyPartPreference === "Auto-detect"}
                    onChange={(e) => setBodyPartPreference(e.target.value)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                  />
                  <Label htmlFor="auto-detect" className="text-sm font-medium  cursor-pointer">
                    Auto-detect
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="hand-wrist"
                    name="bodyPartPreference"
                    value="Hand/Wrist"
                    checked={bodyPartPreference === "Hand/Wrist"}
                    onChange={(e) => setBodyPartPreference(e.target.value)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                  />
                  <Label htmlFor="hand-wrist" className="text-sm font-medium  cursor-pointer">
                    Hand/Wrist
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id="leg-foot"
                    name="bodyPartPreference"
                    value="Leg/Foot"
                    checked={bodyPartPreference === "Leg/Foot"}
                    onChange={(e) => setBodyPartPreference(e.target.value)}
                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 focus:ring-red-500"
                  />
                  <Label htmlFor="leg-foot" className="text-sm font-medium cursor-pointer">
                    Leg/Foot
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Processing Overlay */}
        {isProcessing && (
          <Card className="rounded-2xl mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border-blue-200 dark:border-gray-700">
            <CardContent className="p-6">
              <div className="text-center">
                <AILoader />
                <div className="mt-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">AI Analysis in Progress</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                    Our AI agents are analyzing your medical image. This may take a few moments.
                  </p>
                  <div className="space-y-2 text-left max-w-sm mx-auto">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Validating image quality...</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Detecting body part...</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Analyzing for fractures...</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="w-2 h-2 bg-blue-500 dark:bg-blue-400 rounded-full animate-pulse"></div>
                      <span>Generating medical assessment...</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Process Button */}
        <Button
          onClick={handleProcess}
          disabled={isProcessing || !selectedFile}
          className="w-full bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          {isProcessing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Analyzing...
            </div>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Analyze X-ray
            </>
          )}
        </Button>

        {/* Analysis Results */}
        {analysisResult && (
          <Card className="rounded-2xl mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Analysis Results
              </CardTitle>
              <CardDescription>AI-powered analysis of your medical image</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Image Comparison */}
              {(analysisResult.cloudinary_urls || analysisResult.data?.cloudinary_urls) && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Image Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Original Image</p>
                      <img 
                        src={(analysisResult.cloudinary_urls?.original_image_url || analysisResult.data?.cloudinary_urls?.original_image_url)}
                        alt="Original X-ray"
                        className="w-full h-64 object-contain bg-gray-50 rounded-lg border"
                        onError={(e) => {
                          console.error('Failed to load original image:', e.currentTarget.src)
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                        onLoad={() => console.log('Original image loaded successfully')}
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">AI Analysis (with detections)</p>
                      <img 
                        src={(analysisResult.cloudinary_urls?.annotated_image_url || analysisResult.data?.cloudinary_urls?.annotated_image_url)}
                        alt="Annotated X-ray with AI detections"
                        className="w-full h-64 object-contain bg-gray-50 rounded-lg border"
                        onError={(e) => {
                          console.error('Failed to load annotated image:', e.currentTarget.src)
                          e.currentTarget.src = '/placeholder.jpg'
                        }}
                        onLoad={() => console.log('Annotated image loaded successfully')}
                      />
                    </div>
                  </div>
                  {/* Debug info - remove in production */}
                  
                </div>
              )}

              {/* Patient Information Display */}
              {patientInfo && (patientInfo.name || patientInfo.patientId || patientInfo.age || patientInfo.gender !== 'unknown') && (
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">Patient Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    {patientInfo.name && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Name:</span>
                        <p className="text-sm text-gray-900">{patientInfo.name}</p>
                      </div>
                    )}
                    {patientInfo.patientId && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Patient ID:</span>
                        <p className="text-sm text-gray-900">{patientInfo.patientId}</p>
                      </div>
                    )}
                    {patientInfo.age && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Age:</span>
                        <p className="text-sm text-gray-900">{patientInfo.age} years</p>
                      </div>
                    )}
                    {patientInfo.gender && patientInfo.gender !== 'unknown' && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Gender:</span>
                        <p className="text-sm text-gray-900 capitalize">{patientInfo.gender}</p>
                      </div>
                    )}
                    {patientInfo.mrn && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">MRN:</span>
                        <p className="text-sm text-gray-900">{patientInfo.mrn}</p>
                      </div>
                    )}
                    {patientInfo.dob && (
                      <div>
                        <span className="text-sm font-medium text-gray-600">Date of Birth:</span>
                        <p className="text-sm text-gray-900">{new Date(patientInfo.dob).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Triage Assessment - Most Important */}
              {analysisResult.triage && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Medical Assessment</h3>
                  <div className={`p-6 rounded-lg border-l-4 ${
                    analysisResult.triage.level === 'RED' ? 'bg-red-50 border-red-500' :
                    analysisResult.triage.level === 'AMBER' ? 'bg-yellow-50 border-yellow-500' :
                    'bg-green-50 border-green-500'
                  }`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        analysisResult.triage.level === 'RED' ? 'bg-red-100 text-red-800' :
                        analysisResult.triage.level === 'AMBER' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {analysisResult.triage.level} PRIORITY
                      </span>
                      <span className="text-sm font-medium text-gray-700">
                        {analysisResult.triage.body_part?.toUpperCase()} ANALYSIS
                      </span>
                    </div>
                    
                    {/* Key Findings */}
                    {analysisResult.triage.detections && analysisResult.triage.detections.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-base font-semibold mb-2 text-gray-900">Key Findings:</h4>
                        <div className="space-y-2">
                          {analysisResult.triage.detections.map((detection: any, index: number) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border shadow-sm">
                              <div>
                                <span className="font-semibold capitalize text-gray-900">{detection.label}</span>
                                <p className="text-sm text-gray-600">Detected in the image analysis</p>
                              </div>
                              <div className="text-right">
                                <div className={`text-sm font-medium ${
                                  detection.score > 0.8 ? 'text-red-600' : 
                                  detection.score > 0.6 ? 'text-yellow-600' : 'text-green-600'
                                }`}>
                                  {(detection.score * 100).toFixed(1)}% confidence
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommendations - Most Important */}
                    {analysisResult.triage.recommendations && (
                      <div className="mb-4">
                        <h4 className="text-base font-semibold mb-2 text-gray-900">Recommendations:</h4>
                        <div className="space-y-2">
                          {analysisResult.triage.recommendations.map((recommendation: string, index: number) => (
                            <div key={index} className="flex items-start gap-2 p-3 bg-white rounded-lg">
                              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span className="text-sm text-gray-700">{recommendation}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Patient Summary */}
              {analysisResult.patient_summary && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Summary</h3>
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-gray-700 leading-relaxed">{analysisResult.patient_summary}</p>
                  </div>
                </div>
              )}

              {/* PDF Report */}
              {analysisResult.pdf_report && (
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Medical Report</h3>
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">
                            {analysisResult.pdf_report.filename || 'Medical Report'}
                          </h4>
                          <p className="text-sm text-gray-600">
                            PDF Report • {analysisResult.pdf_report.size_bytes ? 
                              `${(analysisResult.pdf_report.size_bytes / 1024).toFixed(1)} KB` : 
                              'Generated Report'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          onClick={handlePreviewPDF}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Preview
                        </Button>
                        <Button 
                          onClick={handleDownloadPDF}
                          variant="outline"
                          size="sm"
                          className="bg-white hover:bg-green-50 border-green-300 text-green-700 hover:text-green-800"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Download
                        </Button>
                      </div>
                    </div>
                    
                    {/* PDF Preview */}
                    {showPDFPreview && pdfBlobUrl && (
                      <div className="mt-4 border-2 border-green-200 rounded-lg overflow-hidden">
                        <div className="bg-green-100 px-4 py-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-green-800">PDF Preview</span>
                          <button
                            onClick={closePDFPreview}
                            className="text-green-600 hover:text-green-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <iframe
                          src={pdfBlobUrl}
                          className="w-full h-96 border-0"
                          title="PDF Preview"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medical Disclaimer */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with a qualified healthcare provider for medical concerns.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-4 border-t">
                <Button
                  onClick={handleSaveReport}
                  disabled={isSaving || !analysisResult}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Saving...
                    </div>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      Save Report
                    </>
                  )}
                </Button>
                
                {analysisResult?.pdf_report && (
                  <Button
                    onClick={handleDownloadPDF}
                    variant="outline"
                    className="bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700 hover:text-blue-800"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  onClick={() => {
                    setAnalysisResult(null)
                    setProcessedFilename("")
                    resetPatientInfo() // Reset patient information
                    closePDFPreview() // Clean up PDF preview
                  }}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Analysis
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    const originalUrl = analysisResult.cloudinary_urls?.original_image_url || analysisResult.data?.cloudinary_urls?.original_image_url
                    if (originalUrl) {
                      window.open(originalUrl, '_blank')
                    } else {
                      toast({
                        title: "Image not available",
                        description: "Original image URL not found.",
                        variant: "destructive"
                      })
                    }
                  }}
                  className="flex-1"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Full Image
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
