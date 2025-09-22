import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function DocsPage() {
  const inputFormats = [
    { format: "DICOM", description: "Digital Imaging and Communications in Medicine standard format" },
    { format: "PNG", description: "Portable Network Graphics for high-quality medical images" },
    { format: "JPEG", description: "Joint Photographic Experts Group format for compressed images" },
    { format: "TIFF", description: "Tagged Image File Format for lossless medical imaging" },
  ]

  const supportedModalities = [
    { modality: "X-ray", description: "Digital radiography for bone and joint imaging" },
    { modality: "CT Scan", description: "Computed Tomography for detailed cross-sectional views" },
    { modality: "MRI", description: "Magnetic Resonance Imaging for soft tissue and bone analysis" },
  ]

  const outputTypes = [
    {
      type: "Clinical Report",
      description: "Structured medical report with findings, diagnosis, and recommendations",
      features: ["ICD-10 codes", "Confidence scores", "Treatment recommendations", "Follow-up suggestions"],
    },
    {
      type: "Patient Explanation",
      description: "Patient-friendly summary in accessible language",
      features: ["Plain language explanations", "Visual annotations", "Next steps guidance", "FAQ section"],
    },
    {
      type: "Triage Classification",
      description: "Priority-based classification system",
      features: [
        "Red/Amber/Green levels",
        "Urgency indicators",
        "Resource allocation guidance",
        "Escalation protocols",
      ],
    },
  ]

  const limitations = [
    "Images must have minimum resolution of 512x512 pixels",
    "Maximum file size of 50MB per image",
    "Currently supports orthopedic conditions only",
    "Requires clear anatomical visibility in images",
    "Not suitable for pediatric cases under 12 years",
    "Cannot process images with excessive artifacts or poor quality",
  ]

  return (
  <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">Documentation</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Complete overview of OrthoAssist capabilities, supported formats, and system limitations.
            </p>
          </div>

          {/* Quick Navigation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                  AI Agents
                </CardTitle>
                <CardDescription>Learn about our specialized diagnostic agents</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/product/agents">View Agents</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Workflow
                </CardTitle>
                <CardDescription>Understand our multi-step diagnostic process</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/product/workflow">View Workflow</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Support
                </CardTitle>
                <CardDescription>Get help and contact our team</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/contact">Contact Us</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Supported Inputs */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Supported Inputs</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Image Formats</CardTitle>
                  <CardDescription>Supported file formats for medical imaging</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {inputFormats.map((format, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-gray-900">{format.format}</span>
                          <p className="text-gray-600 text-sm">{format.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Imaging Modalities</CardTitle>
                  <CardDescription>Medical imaging types we can analyze</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {supportedModalities.map((modality, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-600 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="font-semibold text-gray-900">{modality.modality}</span>
                          <p className="text-gray-600 text-sm">{modality.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Additional Input Types</CardTitle>
                <CardDescription>Supplementary data that enhances diagnostic accuracy</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Clinical Notes</h4>
                    <p className="text-gray-600 text-sm">Patient history, symptoms, and clinical observations</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Audio Descriptions</h4>
                    <p className="text-gray-600 text-sm">Verbal descriptions of patient condition and symptoms</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Previous Studies</h4>
                    <p className="text-gray-600 text-sm">Historical imaging for comparison and progression tracking</p>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Lab Results</h4>
                    <p className="text-gray-600 text-sm">Relevant laboratory findings and biomarkers</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* System Outputs */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">System Outputs</h2>
            <div className="space-y-6">
              {outputTypes.map((output, index) => (
                <Card key={index} className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-xl">{output.type}</CardTitle>
                    <CardDescription className="text-base">{output.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {output.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></div>
                          <span className="text-gray-700 text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* System Limitations */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">System Limitations</h2>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                  Important Limitations
                </CardTitle>
                <CardDescription>Please review these limitations to ensure optimal use of OrthoAssist</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {limitations.map((limitation, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 flex-shrink-0"></div>
                      <span className="text-gray-700">{limitation}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Getting Started */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Get Started?</h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Explore our platform with a free trial or schedule a personalized demo to see how OrthoAssist can
              transform your diagnostic workflow.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/demo">Start Free Trial</Link>
              </Button>
              <Button size="lg" variant="outline" className="bg-transparent" asChild>
                <Link href="/contact">Schedule Demo</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
