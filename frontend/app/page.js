'use client';

import { useState, useEffect } from "react"
import { LoginForm } from "@/components/login-form"
import { getMe } from "@/lib/api"
import { Button } from "@/components/ui/button"

export default function Home() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      getMe(token)
        .then(setUser)
        .catch(() => {
          localStorage.removeItem("token")
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem("token")
    setUser(null)
  }

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <p className="animate-pulse">Loading...</p>
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <Card className="p-6">
            <h1 className="text-2xl font-bold mb-4">Welcome, {user.username}!</h1>
            <p className="text-muted-foreground mb-6">You are successfully logged in.</p>
            <Button onClick={handleLogout} variant="outline" className="w-full">
              Logout
            </Button>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
            >
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
          </div>
          Acme Inc.
        </a>
        <LoginForm />
      </div>
    </div>
  )
}

function Card({ children, className }) {
  return (
    <div className={`rounded-xl border bg-card text-card-foreground shadow ${className}`}>
      {children}
    </div>
  )
}

