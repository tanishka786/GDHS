import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function ResultsPage() {
  // Mock data for demonstration
  const studyData = {
    id: "ST-001",
    timestamp: "2024-01-15 14:30:22",
    modality: "X-ray",
    bodyPart: "Hand",
    triage: {
      level: "red",
      rationale:
        "Suspected displaced fracture of the 5th metacarpal with potential complications requiring immediate attention.",
    },
    findings: [
      "Displaced fracture of 5th metacarpal shaft",
      "Soft tissue swelling around fracture site",
      "No evidence of joint involvement",
      "Bone alignment requires surgical evaluation",
    ],
  }

  const getTriageBadge = (level: string) => {
    const variants = {
      red: "bg-red-100 text-red-800",
      amber: "bg-yellow-100 text-yellow-800",
      green: "bg-green-100 text-green-800",
    }
    return <Badge className={variants[level as keyof typeof variants]}>{level.toUpperCase()} PRIORITY</Badge>
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Study Results</h1>
        <p className="text-gray-600 mt-2">AI analysis results and diagnostic findings</p>
      </div>

      <div className="max-w-4xl">
        {/* Study Header */}
        <Card className="rounded-2xl mb-6">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Study {studyData.id}</CardTitle>
                <CardDescription>
                  {studyData.timestamp} • {studyData.modality} • {studyData.bodyPart}
                </CardDescription>
              </div>
              {getTriageBadge(studyData.triage.level)}
            </div>
          </CardHeader>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Triage & Findings */}
          <div className="space-y-6">
            {/* Triage Assessment */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Triage Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-3">{getTriageBadge(studyData.triage.level)}</div>
                <p className="text-gray-700">{studyData.triage.rationale}</p>
              </CardContent>
            </Card>

            {/* Findings */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Clinical Findings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {studyData.findings.map((finding, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{finding}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Image Preview & Actions */}
          <div className="space-y-6">
            {/* Image Preview */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Image Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <svg
                      className="w-16 h-16 text-gray-400 mx-auto mb-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <p className="text-gray-600">Image viewer placeholder</p>
                    <p className="text-sm text-gray-500">Full DICOM viewer coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Generate reports and find nearby facilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full" variant="default">
                  Generate Report
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  Explain to Patient
                </Button>
                <Button className="w-full bg-transparent" variant="outline">
                  Find Nearby Hospitals
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
