"use client";

import { Building2, GraduationCap, HeartHandshake, Scale, Stethoscope, Users } from "lucide-react";

const useCases = [
  {
    title: "Healthcare Providers",
    description: "Streamline diagnostic workflows with AI-powered X-ray analysis and automated triage systems for faster patient care.",
    icon: <Stethoscope className="w-6 h-6" />,
  },
  {
    title: "Medical Institutions",
    description: "Integrate advanced orthopedic analysis into existing hospital systems with enterprise-grade security and compliance.",
    icon: <Building2 className="w-6 h-6" />,
  },
  {
    title: "Emergency Departments",
    description: "Rapid fracture detection and priority-based triage for urgent cases with real-time diagnostic insights.",
    icon: <HeartHandshake className="w-6 h-6" />,
  },
  {
    title: "Telemedicine",
    description: "Remote diagnostic capabilities for rural and underserved communities with cloud-based AI analysis.",
    icon: <Users className="w-6 h-6" />,
  },
  {
    title: "Legal & Insurance",
    description: "Objective medical documentation and expert-level analysis for legal proceedings and insurance claims.",
    icon: <Scale className="w-6 h-6" />,
  },
  {
    title: "Medical Education",
    description: "Training platform for medical students and residents with interactive case studies and diagnostic practice.",
    icon: <GraduationCap className="w-6 h-6" />,
  },
];

export function SimpleUseCaseCard({ useCase }: { useCase: typeof useCases[0] }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center mb-4">
        <div className="p-2 bg-primary/10 rounded-lg mr-3">
          <div className="text-primary">
            {useCase.icon}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          {useCase.title}
        </h3>
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">
        {useCase.description}
      </p>
    </div>
  );
}

export function UseCasesSection() {
  return (
    <section className="py-20 bg-background" id="use-cases">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Transforming Healthcare Across
            <span className="text-primary"> Multiple Industries</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-3xl mx-auto">
            OrthoAssist adapts to diverse healthcare environments, providing AI-powered diagnostic assistance wherever orthopedic care is needed.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {useCases.map((useCase, index) => (
            <SimpleUseCaseCard key={index} useCase={useCase} />
          ))}
        </div>
      </div>
    </section>
  );
}