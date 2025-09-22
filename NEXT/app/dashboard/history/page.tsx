"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import PatientCard from "@/components/ui/patient-card"
import { Loader2, Search, Users } from "lucide-react"

export default function HistoryPage() {
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [severityFilter, setSeverityFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [patients, setPatients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Fetch patients from API
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/patients')
        const data = await response.json()
        
        if (data.success) {
          setPatients(data.patients)
        } else {
          setError('Failed to fetch patients')
        }
      } catch (err) {
        setError('Failed to fetch patients')
        console.error('Error fetching patients:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPatients()
  }, [])

  // Filter patients based on search and filters
  const filteredPatients = patients.filter((patient) => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        patient.name?.toLowerCase().includes(searchLower) ||
        patient.patientId?.toLowerCase().includes(searchLower) ||
        patient.mrn?.toLowerCase().includes(searchLower) ||
        patient.email?.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Severity filter
    if (severityFilter && patient.lastTriageLevel !== severityFilter) return false

    // Date filters
    if (dateFrom && new Date(patient.lastVisit) < new Date(dateFrom)) return false
    if (dateTo && new Date(patient.lastVisit) > new Date(dateTo)) return false

    return true
  })

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Patient History</h1>
        </div>
        <p className="text-gray-600">View and manage your patient records and diagnostic studies</p>
      </div>

      {/* Filters */}
      <Card className="rounded-2xl mb-6">
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Filter patients by date range, severity, and search terms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <Label htmlFor="search">Search Patients</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Name, ID, MRN..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="date-from">From Date</Label>
              <Input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="date-to">To Date</Label>
              <Input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="severity">Priority Level</Label>
              <select
                id="severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Priorities</option>
                <option value="RED">Red Priority</option>
                <option value="AMBER">Amber Priority</option>
                <option value="GREEN">Green Priority</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setDateFrom("")
                  setDateTo("")
                  setSeverityFilter("")
                  setSearchTerm("")
                }}
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading && (
        <Card className="rounded-2xl">
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Loading patients...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="rounded-2xl">
          <CardContent className="py-12">
            <div className="text-center text-red-600">
              <p>{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()} 
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Patient Grid */}
      {!loading && !error && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Patient Records ({filteredPatients.length} patients)
            </CardTitle>
            <CardDescription>
              {filteredPatients.length === 0 && patients.length > 0 
                ? "No patients match your current filters" 
                : "Complete history of your patients and their diagnostic studies"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {patients.length === 0 ? "No patients found" : "No patients match your filters"}
                </h3>
                <p className="text-gray-600">
                  {patients.length === 0 
                    ? "Upload your first diagnostic study to see patients here." 
                    : "Try adjusting your search criteria or clearing the filters."
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredPatients.map((patient) => (
                  <PatientCard
                    key={patient.patientId}
                    patient={patient}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
