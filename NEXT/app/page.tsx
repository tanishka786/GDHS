"use client"
import { Footer } from "@/components/footer"
import { HeroScrollDemo } from "@/components/hero-scroll-demo"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UseCasesSection } from "@/components/use-cases-3d"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()
  return (
    
    <div className="min-h-screen ">
      <Navbar />
      
      {/* Hero Section with Scroll Animation */}
      <HeroScrollDemo />

      {/* Action Buttons */}
      <section className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
            <Link href="/signup">Get Started</Link>
                  </span>
            </button>
            <button className="relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50" >
            <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
            <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
              <Link href="/product/workflow">View Workflow</Link>
            </span>
            </button>
          </div>
        </div>
      </section>

      
      {/* Feature Cards */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  Multi-Modal Inputs
                </CardTitle>
                <CardDescription>
                  Process X-ray, CT, MRI images along with text notes and audio descriptions for comprehensive analysis.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  Real-Time Triage
                </CardTitle>
                <CardDescription>
                  Instant Red/Amber/Green classification system for immediate priority assessment and clinical decision
                  support.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 10V3L4 14h7v7l9-11h-7z"
                      />
                    </svg>
                  </div>
                  MCP Collaboration
                </CardTitle>
                <CardDescription>
                  Parallel agent processing enables faster, more confident diagnosis through specialized body part
                  expertise.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  Clinician & Patient Output
                </CardTitle>
                <CardDescription>
                  Generate structured doctor reports and patient-friendly explanations from the same analysis.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Workflow Preview */}
  <section className="py-16 bg-muted px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Workflow Overview</h2>
          <div className="flex flex-col md:flex-row items-center justify-between space-y-8 md:space-y-0 md:space-x-4">
            {[
              { step: "Validate", desc: "Input verification" },
              { step: "Detect", desc: "Body part agents" },
              { step: "Review", desc: "Hairline analysis" },
              { step: "Triage", desc: "R/A/G classification" },
              { step: "Diagnose", desc: "LLM analysis" },
              { step: "Report", desc: "Generate outputs" },
              { step: "Locate", desc: "Hospital finder" },
            ].map((item, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold mb-3">
                  {index + 1}
                </div>
                <h3 className="font-semibold text-foreground">{item.step}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
                {index < 6 && (
                  <div className="hidden md:block w-8 h-0.5 bg-border mt-8 absolute translate-x-12"></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 px-4 py-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-blue-800 dark:text-blue-200 font-medium">Why MCP? Parallel agents = speed + confidence</span>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases with 3D Cards */}
      <UseCasesSection />

      {/* FAQ */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-foreground mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                What imaging modalities does OrthoAssist support?
              </h3>
              <p className="text-muted-foreground">
                OrthoAssist supports X-ray, CT, and MRI images, along with text notes and audio descriptions for
                comprehensive analysis.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">How accurate is the AI diagnosis?</h3>
              <p className="text-muted-foreground">
                Our multi-agent system provides specialist-level accuracy with built-in validation and confidence
                scoring for reliable clinical decision support.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Is OrthoAssist HIPAA compliant?</h3>
              <p className="text-muted-foreground">
                Yes, OrthoAssist is fully HIPAA compliant with end-to-end encryption and secure data handling protocols.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Can I integrate OrthoAssist with my existing PACS system?
              </h3>
              <p className="text-muted-foreground">
                Yes, we provide API integration capabilities and work with most major PACS systems for seamless workflow
                integration.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">What kind of support do you provide?</h3>
              <p className="text-muted-foreground">
                We offer comprehensive support including training, technical assistance, and dedicated account
                management for enterprise customers.
              </p>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  )
}
