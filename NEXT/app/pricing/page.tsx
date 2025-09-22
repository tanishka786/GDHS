import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function PricingPage() {
  const pricingPlans = [
    {
      name: "Basic",
      description: "Essential features for small practices",
      price: "Contact for pricing",
      features: [
        "Up to 100 studies per month",
        "Basic triage system (R/A/G)",
        "Standard diagnostic reports",
        "Email support",
        "Basic API access",
        "HIPAA compliance",
      ],
      popular: false,
    },
    {
      name: "Pro",
      description: "Advanced features for growing practices",
      price: "Contact for pricing",
      features: [
        "Unlimited studies",
        "Advanced AI agents",
        "Custom report templates",
        "Priority support",
        "Full API access",
        "Advanced analytics",
        "Multi-user accounts",
        "Integration support",
      ],
      popular: true,
    },
    {
      name: "Enterprise",
      description: "Full-scale deployment solutions",
      price: "Contact for pricing",
      features: [
        "Custom deployment options",
        "Dedicated support team",
        "Custom agent development",
        "SLA guarantees",
        "On-premise deployment",
        "Advanced security features",
        "Training and onboarding",
        "24/7 phone support",
      ],
      popular: false,
    },
  ]

  return (
  <div className="min-h-screen bg-background">
      <Navbar />

      <div className="pt-20 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
              Simple, Transparent Pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto text-pretty">
              Choose the plan that fits your practice size and diagnostic volume. All plans include our core AI agents
              and HIPAA-compliant infrastructure.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`rounded-2xl relative ${plan.popular ? "border-blue-200 shadow-lg" : ""}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-blue-600 text-white px-4 py-1">Most Popular</Badge>
                  </div>
                )}
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-lg">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <div className="text-3xl font-bold text-gray-900">{plan.price}</div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className={`w-full ${plan.popular ? "" : "bg-transparent"}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Pricing FAQ</h2>
            <div className="max-w-4xl mx-auto space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">How is pricing calculated?</h3>
                <p className="text-gray-600">
                  Pricing is based on your monthly diagnostic volume, required features, and deployment preferences. We
                  offer flexible plans to accommodate practices of all sizes.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Is there a free trial available?</h3>
                <p className="text-gray-600">
                  Yes, we offer a 30-day free trial with up to 50 diagnostic studies to help you evaluate OrthoAssist
                  for your practice.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What's included in the setup process?</h3>
                <p className="text-gray-600">
                  All plans include initial setup assistance, training for your team, and integration support with your
                  existing systems. Enterprise plans include dedicated onboarding.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Can I upgrade or downgrade my plan?</h3>
                <p className="text-gray-600">
                  Yes, you can change your plan at any time. Upgrades take effect immediately, while downgrades take
                  effect at your next billing cycle.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">What payment methods do you accept?</h3>
                <p className="text-gray-600">
                  We accept major credit cards, ACH transfers, and can accommodate purchase orders for enterprise
                  customers.
                </p>
              </div>
            </div>
          </section>

          {/* Enterprise CTA */}
          <section className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Need a Custom Solution?</h2>
            <p className="text-lg text-gray-600 mb-6 max-w-2xl mx-auto">
              Large healthcare systems and specialized practices may require custom configurations. Our enterprise team
              can design a solution that fits your specific needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg">Schedule Consultation</Button>
              <Button size="lg" variant="outline" className="bg-transparent">
                Request Demo
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Footer />
    </div>
  )
}
