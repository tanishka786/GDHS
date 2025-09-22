"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestPage() {
  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-medical-blue-700 dark:text-medical-blue-400">
        OrthoAssist Medical Theme Test
      </h1>
      
      {/* Medical Blues */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Medical Blue Palette</h2>
        <div className="grid grid-cols-5 gap-4">
          <Card className="bg-medical-blue-100 text-medical-blue-900">
            <CardHeader>
              <CardTitle className="text-sm">Blue 100</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-medical-blue-200 text-medical-blue-900">
            <CardHeader>
              <CardTitle className="text-sm">Blue 200</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-medical-blue-400 text-white">
            <CardHeader>
              <CardTitle className="text-sm">Blue 400</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-medical-blue-600 text-white">
            <CardHeader>
              <CardTitle className="text-sm">Blue 600</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-medical-blue-900 text-white">
            <CardHeader>
              <CardTitle className="text-sm">Blue 900</CardTitle>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Triage Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Triage Status Colors</h2>
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-triage-green">
            <CardHeader>
              <Badge className="bg-triage-green text-white">Low Priority</Badge>
              <CardTitle className="text-triage-green">Stable Condition</CardTitle>
              <CardDescription>Patient condition is stable and non-urgent</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-triage-amber">
            <CardHeader>
              <Badge className="bg-triage-amber text-white">Medium Priority</Badge>
              <CardTitle className="text-triage-amber">Requires Attention</CardTitle>
              <CardDescription>Patient needs timely medical attention</CardDescription>
            </CardHeader>
          </Card>
          <Card className="border-triage-red">
            <CardHeader>
              <Badge className="bg-triage-red text-white">High Priority</Badge>
              <CardTitle className="text-triage-red">Critical Condition</CardTitle>
              <CardDescription>Immediate medical intervention required</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Medical Background Colors */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Medical Background Variants</h2>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-medical-background border-medical-blue-200">
            <CardHeader>
              <CardTitle className="text-medical-blue-700">Medical Background</CardTitle>
              <CardDescription className="text-medical-text-muted">
                Specialized background for medical interfaces
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-medical-blue-600 hover:bg-medical-blue-700 text-white">
                Medical Action
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-medical-card border-medical-blue-300">
            <CardHeader>
              <CardTitle className="text-medical-blue-800">Medical Card</CardTitle>
              <CardDescription className="text-medical-text-muted">
                Elevated card style for medical data display
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Badge className="bg-medical-teal-500 text-white">AI Analysis</Badge>
                <Badge className="bg-medical-blue-500 text-white">Diagnosis</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Dark Mode Test */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Dark Mode Compatibility</h2>
        <Card className="bg-medical-dark border-medical-blue-700">
          <CardHeader>
            <CardTitle className="text-medical-blue-400">Dark Medical Interface</CardTitle>
            <CardDescription className="text-medical-text-muted">
              Testing dark mode medical colors
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Badge className="bg-triage-green/80 text-white">Green</Badge>
              <Badge className="bg-triage-amber/80 text-black">Amber</Badge>
              <Badge className="bg-triage-red/80 text-white">Red</Badge>
            </div>
            <Button className="bg-medical-blue-600 hover:bg-medical-blue-500 text-white">
              Dark Mode Action
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}