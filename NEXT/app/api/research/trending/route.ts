import { NextResponse } from 'next/server'

interface TrendingTopic {
  id: string
  name: string
  count: number
  trend: "up" | "down" | "stable"
  change: number
}

// Simulate fetching from analytics database
async function fetchTrendingTopicsFromAnalytics(): Promise<TrendingTopic[]> {
  // This would typically query your analytics database
  // For now, we'll simulate real-time trending data
  
  const baseTopics = [
    { name: "AI Diagnosis", baseCount: 1200 },
    { name: "3D Printing", baseCount: 850 },
    { name: "Minimally Invasive", baseCount: 650 },
    { name: "Telemedicine", baseCount: 420 },
    { name: "Growth Plates", baseCount: 380 },
    { name: "Biomarkers", baseCount: 320 },
    { name: "Spine Surgery", baseCount: 290 },
    { name: "Digital Health", baseCount: 250 }
  ]

  return baseTopics.map((topic, index) => {
    // Simulate real-time variations
    const randomVariation = (Math.random() - 0.5) * 100
    const count = Math.max(50, Math.floor(topic.baseCount + randomVariation))
    const change = Math.floor((Math.random() - 0.3) * 30) // Bias toward positive growth
    
    let trend: "up" | "down" | "stable" = "stable"
    if (change > 5) trend = "up"
    else if (change < -5) trend = "down"

    return {
      id: `topic-${index + 1}`,
      name: topic.name,
      count,
      trend,
      change
    }
  }).slice(0, 6) // Return top 6 trending topics
}

export async function GET() {
  try {
    const trendingTopics = await fetchTrendingTopicsFromAnalytics()
    
    return NextResponse.json(trendingTopics, {
      headers: {
        'Cache-Control': 'max-age=300' // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error('Error fetching trending topics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending topics' },
      { status: 500 }
    )
  }
}