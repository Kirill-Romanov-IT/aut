"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { getMe, getClients, uploadCSV } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, LogOut, Table as TableIcon, RefreshCw } from "lucide-react"

export default function DashboardPage() {
    const router = useRouter()
    const [user, setUser] = useState(null)
    const [clients, setClients] = useState([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [fetchError, setFetchError] = useState(null)
    const fileInputRef = useRef(null)

    const fetchData = async () => {
        const token = localStorage.getItem("token")
        if (!token) {
            router.push("/")
            return
        }

        setLoading(true)
        setFetchError(null)
        try {
            // Fetch user info first
            const userData = await getMe(token)
            setUser(userData)

            // Then try to fetch clients independently
            try {
                const clientsData = await getClients(token)
                setClients(clientsData)
            } catch (error) {
                console.error("Failed to fetch clients:", error)
                setFetchError(error.message)
            }
        } catch (error) {
            console.error("Failed to fetch user data:", error)
            localStorage.removeItem("token")
            router.push("/")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [router])

    const handleLogout = () => {
        localStorage.removeItem("token")
        router.push("/")
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0]
        if (!file) return

        const token = localStorage.getItem("token")
        setUploading(true)
        try {
            await uploadCSV(file, token)
            await fetchData() // Refresh the list
        } catch (error) {
            alert("Error uploading CSV: " + error.message)
        } finally {
            setUploading(false)
            if (fileInputRef.current) fileInputRef.current.value = ""
        }
    }

    if (loading) {
        return (
            <div className="flex min-h-svh items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-medium animate-pulse">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh flex-col bg-muted/40 p-4 md:p-8">
            <div className="mx-auto w-full max-w-6xl space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                        <p className="text-muted-foreground">
                            Welcome back, <span className="font-semibold text-foreground">{user?.username}</span>!
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="gap-2"
                        >
                            <Upload className="h-4 w-4" />
                            {uploading ? "Uploading..." : "Import CSV"}
                        </Button>
                        <Button onClick={handleLogout} variant="outline" className="gap-2 text-destructive hover:bg-destructive/10">
                            <LogOut className="h-4 w-4" />
                            Logout
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <Card className="overflow-hidden">
                    <CardHeader className="bg-muted/50 border-b">
                        <div className="flex items-center gap-2">
                            <TableIcon className="h-5 w-5 text-primary" />
                            <CardTitle>Client List</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="bg-muted/30">
                                    <tr className="border-b transition-colors hover:bg-muted/50">
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Phone</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Name</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Company</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Position</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Agent</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Office</th>
                                        <th className="h-12 px-4 py-2 font-medium text-muted-foreground">Summary</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fetchError ? (
                                        <tr>
                                            <td colSpan="7" className="h-32 text-center text-destructive font-medium p-4">
                                                <div className="flex flex-col items-center gap-2">
                                                    <p>Error: {fetchError}</p>
                                                    <Button variant="outline" size="sm" onClick={fetchData}>Try Again</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : clients.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="h-32 text-center text-muted-foreground italic">
                                                No clients found. Import a CSV to get started.
                                            </td>
                                        </tr>
                                    ) : (
                                        clients.map((client, index) => (
                                            <tr key={index} className="border-b transition-colors hover:bg-muted/30">
                                                <td className="px-4 py-3 font-medium">{client.phone_number}</td>
                                                <td className="px-4 py-3">{client.user_name} {client.user_surname}</td>
                                                <td className="px-4 py-3">
                                                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                                                        {client.clients_company}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">{client.position}</td>
                                                <td className="px-4 py-3">{client.agent_name}</td>
                                                <td className="px-4 py-3 font-mono text-xs">{client.location_office}</td>
                                                <td className="px-4 py-3 max-w-xs truncate text-muted-foreground" title={client.previous_call_summary}>
                                                    {client.previous_call_summary}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
