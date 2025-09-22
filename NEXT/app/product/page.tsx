import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProductPage() {
  return (
  <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
              OrthoAssist Product Suite
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Explore our comprehensive AI-powered orthopedic diagnostic platform designed for modern healthcare
              workflows.
            </p>
          </div>

          {/* Product Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <CardTitle>AI Agents</CardTitle>
                <CardDescription>
                  Specialized body part and functional agents working in parallel for comprehensive analysis.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/product/agents">Explore Agents</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <CardTitle>Workflow</CardTitle>
                <CardDescription>
                  Multi-step diagnostic process from validation to reporting with MCP collaboration.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/product/workflow">View Workflow</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <CardTitle>Features</CardTitle>
                <CardDescription>
                  Comprehensive capabilities including multi-modal inputs, real-time triage, and scalable architecture.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full bg-transparent" asChild>
                  <Link href="/product/features">See Features</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Key Benefits */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">Why Choose OrthoAssist?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  80%
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Faster Processing</h3>
                <p className="text-gray-600 text-sm">Parallel agent architecture reduces analysis time significantly</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  95%
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Accuracy Rate</h3>
                <p className="text-gray-600 text-sm">
                  Specialist-level diagnostic accuracy validated in clinical studies
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                  24/7
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Availability</h3>
                <p className="text-gray-600 text-sm">Round-the-clock diagnostic support for critical cases</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  API
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">Integration Ready</h3>
                <p className="text-gray-600 text-sm">Seamless integration with existing healthcare systems</p>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Ready to Transform Your Diagnostic Workflow?</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Join healthcare providers worldwide who trust OrthoAssist for faster, more accurate orthopedic diagnoses.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link href="/demo">Try Demo</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/contact">Contact Sales</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
