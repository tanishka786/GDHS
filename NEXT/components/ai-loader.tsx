import { cn } from "@/lib/utils";
import { useState } from "react";

export const Component = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animated Sphere */}
      <div className="relative">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-purple-400 via-purple-600 to-indigo-700 animate-pulse shadow-2xl">
          <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/30"></div>
        </div>
        
        {/* Floating text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="loader-wrapper">
            <span className="loader-letter text-white font-medium text-lg animate-pulse">G</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-100">e</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-200">n</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-300">e</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-500">r</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-700">a</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-1000">t</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-1200">i</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-1500">n</span>
            <span className="loader-letter text-white font-medium text-lg animate-pulse delay-1700">g</span>
          </div>
        </div>
        
        {/* Rotating ring */}
        <div className="absolute -inset-2 rounded-full border-2 border-purple-300/30 animate-spin" style={{animationDuration: '3s'}}></div>
        <div className="absolute -inset-4 rounded-full border border-purple-200/20 animate-spin" style={{animationDuration: '6s', animationDirection: 'reverse'}}></div>
      </div>
      
      {/* Optional loading dots */}
      <div className="flex space-x-1 mt-6">
        <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce delay-200"></div>
      </div>
    </div>
  );
};
