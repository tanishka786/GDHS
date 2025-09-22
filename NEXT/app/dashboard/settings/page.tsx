"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function SettingsPage() {
  const [enablePatientExplanations, setEnablePatientExplanations] = useState(true)
  const [autoGeneratePDF, setAutoGeneratePDF] = useState(false)
  const [defaultBodyPart, setDefaultBodyPart] = useState("Hand")

  const handleSave = () => {
    // Save settings logic would go here
    alert("Settings saved successfully!")
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Configure your OrthoAssist preferences</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* General Settings */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>Configure default behavior and preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable patient explanations</Label>
                <p className="text-sm text-gray-600">Automatically generate patient-friendly explanations</p>
              </div>
              <button
                onClick={() => setEnablePatientExplanations(!enablePatientExplanations)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enablePatientExplanations ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                    enablePatientExplanations ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Auto-generate PDF reports</Label>
                <p className="text-sm text-gray-600">Automatically create PDF versions of reports</p>
              </div>
              <button
                onClick={() => setAutoGeneratePDF(!autoGeneratePDF)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoGeneratePDF ? "bg-blue-600" : "bg-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-card transition-transform ${
                    autoGeneratePDF ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <Label htmlFor="default-body-part" className="text-base font-medium">
                Default body part
              </Label>
              <p className="text-sm text-gray-600 mb-2">Pre-select this body part in upload forms</p>
              <select
                id="default-body-part"
                value={defaultBodyPart}
                onChange={(e) => setDefaultBodyPart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Hand">Hand</option>
                <option value="Leg">Leg</option>
                <option value="Spine">Spine</option>
                <option value="Ribs">Ribs</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Account Settings */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>Manage your account preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">Email Notifications</Label>
              <p className="text-sm text-gray-600 mb-2">Receive notifications about study completions</p>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">High priority studies (Red)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" defaultChecked />
                  <span className="text-sm">Medium priority studies (Amber)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-sm">Low priority studies (Green)</span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Settings */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>API Settings</CardTitle>
            <CardDescription>Configure API access and integrations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">API Key</Label>
                <p className="text-sm text-gray-600 mb-2">Use this key to access the OrthoAssist API</p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value="sk-orth-1234567890abcdef"
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  />
                  <Button variant="outline">Copy</Button>
                  <Button variant="outline">Regenerate</Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full" size="lg">
          Save Settings
        </Button>
      </div>
    </div>
  )
}
