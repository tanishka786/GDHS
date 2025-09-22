import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, User, Phone, Mail, Activity, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface PatientCardProps {
  patient: {
    patientId: string;
    name: string;
    age?: number;
    gender?: string;
    mrn?: string;
    phone?: string;
    email?: string;
    lastVisit: string;
    totalStudies: number;
    lastTriageLevel?: string;
    lastBodyPart?: string;
  };
}

export default function PatientCard({ patient }: PatientCardProps) {
  const router = useRouter();

  const handleViewDetails = () => {
    router.push(`/dashboard/patients/${patient.patientId}`);
  };
  const getTriageBadge = (level?: string) => {
    if (!level) return null;
    
    const variants = {
      RED: "bg-red-100 text-red-800 border-red-200",
      AMBER: "bg-yellow-100 text-yellow-800 border-yellow-200",
      GREEN: "bg-green-100 text-green-800 border-green-200",
    };
    
    return (
      <Badge className={`${variants[level as keyof typeof variants]} border`}>
        {level} Priority
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card className="h-full hover:shadow-lg transition-all duration-200 border border-gray-200 rounded-2xl bg-white">
      <CardContent className="p-6">
        {/* Header with Patient ID and Status */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              Patient #{patient.patientId}
            </h3>
            <div className="flex items-center gap-2">
              {getTriageBadge(patient.lastTriageLevel)}
              <span className="text-sm text-gray-500">
                {patient.totalStudies} {patient.totalStudies === 1 ? 'study' : 'studies'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-gray-400">
            <User size={16} />
          </div>
        </div>

        {/* Patient Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <User size={14} className="text-gray-400" />
            <span className="font-medium text-gray-700">{patient.name}</span>
            {patient.age && (
              <span className="text-gray-500">• {patient.age} years</span>
            )}
            {patient.gender && (
              <span className="text-gray-500 capitalize">• {patient.gender}</span>
            )}
          </div>

          {patient.mrn && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <FileText size={14} className="text-gray-400" />
              <span>MRN: {patient.mrn}</span>
            </div>
          )}

          {patient.phone && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone size={14} className="text-gray-400" />
              <span>{patient.phone}</span>
            </div>
          )}

          {patient.email && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail size={14} className="text-gray-400" />
              <span className="truncate">{patient.email}</span>
            </div>
          )}
        </div>

        {/* Last Visit Info */}
        <div className="border-t border-gray-100 pt-4 mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Calendar size={14} className="text-gray-400" />
            <span>Last Visit: {formatDate(patient.lastVisit)}</span>
          </div>
          
          {patient.lastBodyPart && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Activity size={14} className="text-gray-400" />
              <span>Last Scan: {patient.lastBodyPart}</span>
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button 
          onClick={handleViewDetails}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          View Patient Details
        </Button>
      </CardContent>
    </Card>
  );
}