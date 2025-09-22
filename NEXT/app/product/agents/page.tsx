import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AgentsPage() {
  const bodyPartAgents = [
    {
      name: "Hands Agent",
      description:
        "Specialized in detecting fractures, dislocations, and soft tissue injuries in hand and wrist X-rays, CT, and MRI scans.",
      icon: (
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3.5M3 16.5h18"
          />
        </svg>
      ),
    },
    {
      name: "Legs Agent",
      description:
        "Expert analysis of lower extremity injuries including femur, tibia, fibula fractures and joint abnormalities.",
      icon: (
        <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      name: "Validation Agent",
      description:
        "Blocks poor quality or unsupported inputs, ensuring only analyzable images proceed through the workflow.",
      icon: (
        <svg className="w-8 h-8 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      name: "Hairline Fracture Agent",
      description:
        "Specialized detection of subtle hairline fractures that may be missed by standard analysis methods.",
      icon: (
        <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
  ]

  const functionalAgents = [
    {
      name: "Diagnosis Agent",
      description:
        "Generates patient-friendly explanations of findings, translating medical terminology into understandable language.",
      icon: (
        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      ),
    },
    {
      name: "Report Agent",
      description:
        "Creates structured, comprehensive doctor reports with clinical findings, recommendations, and diagnostic confidence scores.",
      icon: (
        <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
      name: "Hospital Finder Agent",
      description:
        "Locates nearby medical centers and specialists based on diagnosis severity and required treatment capabilities.",
      icon: (
        <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
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
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">Specialized AI Agents</h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Our modular agent architecture combines body part specialists with functional agents to deliver
              comprehensive orthopedic analysis.
            </p>
          </div>

          {/* Body Part Agents */}
          <section className="mb-16">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Body Part Agents</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Specialized agents trained on specific anatomical regions for precise, targeted analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {bodyPartAgents.map((agent, index) => (
                <Card key={index} className="rounded-2xl hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center">
                        {agent.icon}
                      </div>
                      <div>
                        <CardTitle className="text-xl">{agent.name}</CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">{agent.description}</CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Functional Agents */}
          <section>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">Functional Agents</h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Task-specific agents that handle diagnosis interpretation, reporting, and care coordination.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {functionalAgents.map((agent, index) => (
                <Card key={index} className="rounded-2xl hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-16 h-16 bg-gray-50 rounded-xl flex items-center justify-center mb-4">
                        {agent.icon}
                      </div>
                      <CardTitle className="text-xl">{agent.name}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed text-center">
                      {agent.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Why This Architecture */}
          <section className="mt-16 bg-blue-50 rounded-2xl p-8">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Why Modular Agents?</h3>
              <p className="text-lg text-gray-700 max-w-3xl mx-auto">
                Our modular approach allows each agent to specialize deeply in their domain while working
                collaboratively. This results in higher accuracy, faster processing, and the ability to scale by adding
                new specialized agents as needed.
              </p>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
