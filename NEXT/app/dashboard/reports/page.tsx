import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function ReportsPage() {
  // Mock data for demonstration
  const reports = [
    {
      id: "RPT-001",
      studyId: "ST-001",
      type: "Clinical Report",
      date: "2024-01-15",
      patient: "Patient #1234",
      status: "completed",
    },
    {
      id: "RPT-002",
      studyId: "ST-002",
      type: "Patient Explanation",
      date: "2024-01-15",
      patient: "Patient #1235",
      status: "completed",
    },
    {
      id: "RPT-003",
      studyId: "ST-003",
      type: "Clinical Report",
      date: "2024-01-14",
      patient: "Patient #1236",
      status: "pending",
    },
  ]

  const getStatusBadge = (status: string) => {
    return status === "completed" ? (
      <Badge className="bg-green-100 text-green-800">Completed</Badge>
    ) : (
      <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
        <p className="text-gray-600 mt-2">Generated clinical reports and patient explanations</p>
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Download or view your diagnostic reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reports.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Report ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Study ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Patient</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-gray-100">
                      <td className="py-3 px-4 text-sm font-medium text-gray-900">{report.id}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{report.studyId}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{report.type}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{report.date}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">{report.patient}</td>
                      <td className="py-3 px-4">{getStatusBadge(report.status)}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                          <Button variant="outline" size="sm">
                            Download
                          </Button>
                        </div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">No reports generated</h3>
              <p className="text-gray-600">Reports will appear here after processing studies.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
