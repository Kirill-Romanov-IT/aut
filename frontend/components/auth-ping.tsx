"use client"

import { useEffect } from "react"

export function AuthPing() {
    useEffect(() => {
        const ping = async () => {
            const token = localStorage.getItem("token")
            if (!token) return

            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

            try {
                const response = await fetch(`${API_URL}/users/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (response.status === 401) {
                    console.warn("Auth ping: Session expired")
                    // Optional: redirect to login or clear token
                } else {
                    console.log("Auth ping: Session active")
                }
            } catch (error) {
                console.error("Auth ping: Request failed", error)
            }
        }

        // Ping every 15 minutes (900,000 ms)
        const intervalId = setInterval(ping, 15 * 60 * 1000)

        // Initial ping on mount
        ping()

        return () => clearInterval(intervalId)
    }, [])

    return null
}
