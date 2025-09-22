import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function WorkflowPage() {
  const workflowSteps = [
    {
      step: "1",
      title: "Validate",
      description: "Input verification ensures image quality and format compatibility before processing.",
      details:
        "The Validation Agent checks image resolution, format support, and anatomical visibility to prevent processing of unusable inputs.",
    },
    {
      step: "2",
      title: "Detect",
      description: "Body part-specific agents analyze the validated images for their specialized regions.",
      details:
        "Parallel processing by Hands, Legs, and other specialized agents provides targeted analysis with domain expertise.",
    },
    {
      step: "3",
      title: "Hairline Review",
      description: "Specialized detection of subtle fractures that standard analysis might miss.",
      details:
        "Advanced algorithms specifically trained to identify hairline fractures and micro-trauma that require expert attention.",
    },
    {
      step: "4",
      title: "Triage (R/A/G)",
      description: "Real-time priority classification using Red/Amber/Green severity levels.",
      details:
        "Immediate categorization helps healthcare providers prioritize cases and allocate resources effectively.",
    },
    {
      step: "5",
      title: "Diagnosis (LLM)",
      description: "Large language model synthesizes findings into comprehensive diagnostic assessment.",
      details:
        "AI-powered analysis combines all agent findings to generate confident, evidence-based diagnostic conclusions.",
    },
    {
      step: "6",
      title: "Report",
      description: "Generate structured clinical reports and patient-friendly explanations.",
      details:
        "Dual output system creates detailed medical reports for clinicians and accessible explanations for patients.",
    },
    {
      step: "7",
      title: "Hospital Finder",
      description: "Locate nearby medical facilities based on diagnosis and required care level.",
      details: "Intelligent matching of patient needs with appropriate medical facilities and specialist availability.",
    },
  ]

  return (
  <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">Multi-Agent Workflow</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Our systematic approach combines validation, specialized detection, intelligent triage, and comprehensive
              reporting for optimal diagnostic outcomes.
            </p>
          </div>

          {/* Workflow Steps */}
          <div className="space-y-8 mb-16">
            {workflowSteps.map((item, index) => (
              <div key={index} className="flex flex-col md:flex-row gap-8 items-start">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <Card className="flex-1 rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-2xl">{item.title}</CardTitle>
                    <CardDescription className="text-lg">{item.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed">{item.details}</p>
                  </CardContent>
                </Card>
                {index < workflowSteps.length - 1 && (
                  <div className="hidden md:block absolute left-8 mt-20 w-0.5 h-8 bg-gray-300"></div>
                )}
              </div>
            ))}
          </div>

          {/* MCP Advantage */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-16">
            <div className="text-center">
              <div className="inline-flex items-center gap-3 bg-blue-100 px-6 py-3 rounded-full mb-6">
                <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-blue-800 font-semibold">Why MCP?</span>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">Parallel Agents = Speed + Confidence</h3>
              <p className="text-lg text-gray-700 max-w-4xl mx-auto leading-relaxed">
                Our Model Context Protocol (MCP) architecture enables multiple specialized agents to work simultaneously
                rather than sequentially. This parallel processing dramatically reduces analysis time while increasing
                diagnostic confidence through collaborative validation.
              </p>
            </div>
          </section>

          {/* Benefits Grid */}
          <section>
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Workflow Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <CardTitle>Faster Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Parallel agent execution reduces total analysis time from minutes to seconds.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <CardTitle>Higher Accuracy</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Specialized agents provide domain expertise for more precise diagnoses.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                      />
                    </svg>
                  </div>
                  <CardTitle>Scalable Architecture</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Easily add new specialized agents for additional body parts or conditions.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
