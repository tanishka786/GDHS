"use client"

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

interface RoleGuardProps {
  children: React.ReactNode
}

export function RoleGuard({ children }: RoleGuardProps) {
  const { user, isLoaded } = useUser()
  const router = useRouter()
  const [userRole, setUserRole] = useState<string | null>(null)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkUserRole = async () => {
      if (!isLoaded || !user) {
        setIsChecking(false)
        return
      }

      try {
        const response = await fetch('/api/user/get-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ clerkId: user.id }),
        })

        if (response.ok) {
          const userData = await response.json()
          const role = userData.role

          if (!role) {
            console.log('User has no role, redirecting to role selection')
            router.push('/role-selection')
            return
          }

          setUserRole(role)
        } else {
          console.error('Failed to fetch user data')
          router.push('/role-selection')
          return
        }
      } catch (error) {
        console.error('Error checking user role:', error)
        router.push('/role-selection')
        return
      }

      setIsChecking(false)
    }

    checkUserRole()
  }, [user, isLoaded, router])

  // Show loading spinner while checking role
  if (isChecking || !isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Only render children if user has a role
  if (userRole) {
    return <>{children}</>
  }

  // This shouldn't render as user should be redirected, but just in case
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecting to role selection...</p>
      </div>
    </div>
  )
}