"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getMe } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/")
            return
        }

        getMe(token)
            .then(setUser)
            .catch(() => {
                localStorage.removeItem("token")
                router.push("/")
            })
            .finally(() => setLoading(false))
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/")
    }

    if (loading) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <p className="animate-pulse">Loading...</p>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Dashboard</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                        <div className="space-y-2">
                            <h1 className="text-xl font-bold text-green-600">Вы успешно вошли!</h1>
                            <p className="text-sm text-muted-foreground">
                                Добро пожаловать, <span className="font-semibold text-foreground">{user?.username}</span>
                            </p>
                        </div>
                        <Button onClick={handleLogout} variant="outline" className="w-full">
                            Logout
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
