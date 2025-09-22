"use client";
import { ContainerScroll } from "./ui/container-scroll-animation";

export function HeroScrollDemo() {
  return (
    <div className="flex flex-col overflow-hidden">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 text-balance">
              Unleash the power of <br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none text-primary">
                AI Diagnosis
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto text-pretty">
              Multi-agent workflow that validates imaging, detects fractures, triages severity, and generates clear,
              clinician-ready reports.
            </p>
          </>
        }
      >
        {/* Dashboard Preview Content */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 rounded-lg p-4 col-span-2">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-gray-600 ml-2">OrthoAssist Dashboard</span>
            </div>
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3">
              <div className="text-xs font-semibold text-gray-500 mb-2">X-RAY ANALYSIS</div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Image Validated</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">Fracture Detected</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">High Priority</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Triage Status */}
        <div className="bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-950 dark:to-orange-900 rounded-lg p-4">
          <div className="h-full flex flex-col justify-center items-center text-center">
            <div className="w-8 h-8 bg-red-500 rounded-full mb-2 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
            <div className="text-xs font-semibold text-red-700 dark:text-red-300">RED</div>
            <div className="text-xs text-red-600 dark:text-red-400">Urgent</div>
          </div>
        </div>
        
        {/* AI Analysis */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 dark:from-purple-950 dark:to-pink-900 rounded-lg p-4">
          <div className="h-full flex flex-col">
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">AI ANALYSIS</div>
            <div className="flex-1 flex flex-col justify-center">
              <div className="w-full bg-purple-200 dark:bg-purple-700 rounded-full h-1 mb-1">
                <div className="bg-purple-500 h-1 rounded-full w-4/5"></div>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">Processing...</div>
            </div>
          </div>
        </div>
        
        {/* Report Generation */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-950 dark:to-emerald-900 rounded-lg p-4">
          <div className="h-full flex flex-col justify-center items-center text-center">
            <div className="w-8 h-8 bg-green-500 rounded-lg mb-2 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-xs font-semibold text-green-700 dark:text-green-300">Report</div>
            <div className="text-xs text-green-600 dark:text-green-400">Ready</div>
          </div>
        </div>
      </ContainerScroll>
    </div>
  );
}