import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FeaturesPage() {
  const features = [
    {
      title: "Multi-Modal Inputs",
      description: "Process diverse medical imaging formats and supplementary data for comprehensive analysis.",
      details: [
        "X-ray, CT, and MRI image support",
        "DICOM format compatibility",
        "Text notes and clinical history integration",
        "Audio description processing",
        "Batch upload capabilities",
      ],
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      title: "Real-Time Triage",
      description: "Instant priority classification system for immediate clinical decision support.",
      details: [
        "Red/Amber/Green severity classification",
        "Confidence scoring for each assessment",
        "Automated alert system for critical cases",
        "Customizable triage thresholds",
        "Integration with hospital workflows",
      ],
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      ),
    },
    {
      title: "MCP Collaboration",
      description: "Model Context Protocol enables parallel agent processing for faster, more confident diagnoses.",
      details: [
        "Simultaneous multi-agent processing",
        "Cross-agent validation and consensus",
        "Reduced processing time by 80%",
        "Enhanced diagnostic confidence",
        "Scalable agent architecture",
      ],
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      title: "Clinician & Patient Outputs",
      description:
        "Dual reporting system creates appropriate documentation for both medical professionals and patients.",
      details: [
        "Structured clinical reports with ICD codes",
        "Patient-friendly explanations",
        "Visual annotations on images",
        "Treatment recommendations",
        "Follow-up care suggestions",
      ],
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      title: "Scalable Architecture",
      description: "Modular design allows for easy expansion and customization to meet growing needs.",
      details: [
        "Cloud-native deployment options",
        "API-first architecture",
        "Custom agent development support",
        "Enterprise integration capabilities",
        "HIPAA-compliant infrastructure",
      ],
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
    },
  ]

  return (
  <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">Key Features</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Comprehensive capabilities designed to enhance diagnostic accuracy, speed, and clinical workflow
              integration.
            </p>
          </div>

          {/* Features Grid */}
          <div className="space-y-16">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col ${index % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-12 items-center`}
              >
                <div className="flex-1">
                  <Card className="rounded-2xl h-full">
                    <CardHeader>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-card rounded-xl flex items-center justify-center">
                          {feature.icon}
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{feature.title}</CardTitle>
                        </div>
                      </div>
                      <CardDescription className="text-lg leading-relaxed">{feature.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {feature.details.map((detail, detailIndex) => (
                          <li key={detailIndex} className="flex items-start gap-3">
                            <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                            <span className="text-gray-700">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
                <div className="flex-1">
                  <div className="aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-card rounded-full flex items-center justify-center mb-4 mx-auto shadow-lg">
                        {feature.icon}
                      </div>
                      <p className="text-gray-600 font-medium">{feature.title}</p>
                      <p className="text-sm text-gray-500">Feature Visualization</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Technical Specifications */}
          <section className="mt-20 bg-muted rounded-2xl p-8">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Technical Specifications</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{"<30s>"}</div>
                <div className="text-gray-900 font-medium">Average Processing Time</div>
                <div className="text-gray-600 text-sm">From upload to diagnosis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">95%+</div>
                <div className="text-gray-900 font-medium">Diagnostic Accuracy</div>
                <div className="text-gray-600 text-sm">Validated against specialist reviews</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
                <div className="text-gray-900 font-medium">Availability</div>
                <div className="text-gray-600 text-sm">Cloud-based processing</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">HIPAA</div>
                <div className="text-gray-900 font-medium">Compliant</div>
                <div className="text-gray-600 text-sm">Enterprise-grade security</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 mb-2">API</div>
                <div className="text-gray-900 font-medium">Integration</div>
                <div className="text-gray-600 text-sm">RESTful API access</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600 mb-2">Multi</div>
                <div className="text-gray-900 font-medium">Modal Support</div>
                <div className="text-gray-600 text-sm">X-ray, CT, MRI compatible</div>
              </div>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
