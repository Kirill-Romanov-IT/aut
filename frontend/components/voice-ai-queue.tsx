"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ClockIcon, UserIcon, MapPinIcon, MicIcon, Trash2Icon } from "lucide-react"

type CompanyStatus = "new" | "not-responding" | "ivr" | "hang-up" | "dm-found-call-time"

type Company = {
    id: string
    name: string
    location: string
    employees: number
    status: CompanyStatus
    scheduledAt: string
}

const QUEUE_STORAGE_KEY = "voice-ai-queue-state"

const formatCallDate = (isoString: string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]
    const day = date.getDate()
    const month = months[date.getMonth()]
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')

    return `${month} ${day} at ${hour}:${minute}`
}

const getStatusBadge = (status: CompanyStatus) => {
    switch (status) {
        case "new": return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">New</Badge>
        case "not-responding": return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">No Answer</Badge>
        case "ivr": return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">IVR</Badge>
        case "hang-up": return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">Hang Up</Badge>
        case "dm-found-call-time": return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">DM Found</Badge>
        default: return <Badge variant="outline">{status}</Badge>
    }
}

export function VoiceAIQueue() {
    const [mounted, setMounted] = React.useState(false)
    const [companies, setCompanies] = React.useState<Company[]>([])

    React.useEffect(() => {
        setMounted(true)
        const loadData = () => {
            const saved = localStorage.getItem(QUEUE_STORAGE_KEY)
            if (saved) {
                try {
                    const parsed = JSON.parse(saved)
                    // Sort by scheduledAt (earliest first)
                    const sorted = [...parsed].sort((a, b) =>
                        new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                    )
                    setCompanies(sorted)
                } catch (e) {
                    console.error("Failed to load queue data", e)
                }
            }
        }

        loadData()
        // Listen for storage changes in other tabs/components
        window.addEventListener('storage', (e) => {
            if (e.key === QUEUE_STORAGE_KEY) loadData()
        })
        return () => window.removeEventListener('storage', loadData)
    }, [])

    const clearQueue = () => {
        localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify([]))
        setCompanies([])
        // Dispatch event for other tabs
        window.dispatchEvent(new Event('storage'))
    }

    if (!mounted) return null

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">Voice AI Call Queue</CardTitle>
                    <p className="text-sm text-muted-foreground">Upcoming calls at the top</p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={clearQueue}
                    className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 transition-all active:scale-95"
                >
                    <Trash2Icon className="h-4 w-4 mr-2" />
                    Clear Queue
                </Button>
            </CardHeader>
            <CardContent className="px-0">
                <div className="space-y-4">
                    {companies.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                            <p className="text-muted-foreground">Queue is empty. Update data on the Lifecycle board.</p>
                        </div>
                    ) : (
                        companies.map((company, index) => (
                            <div
                                key={company.id}
                                className="group relative flex flex-col md:flex-row items-start md:items-center justify-between p-6 bg-background border rounded-2xl hover:shadow-lg transition-all hover:border-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-4 mb-4 md:mb-0">
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                        {company.name.charAt(0)}
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{company.name}</h3>
                                        <div className="flex flex-wrap items-center gap-3 mt-1">
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <MapPinIcon className="h-3 w-3" />
                                                {company.location}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                <UserIcon className="h-3 w-3" />
                                                {company.employees} emp.
                                            </div>
                                            {getStatusBadge(company.status)}
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-auto flex items-center justify-between md:justify-end gap-6 bg-primary/5 md:bg-transparent p-3 md:p-0 rounded-xl">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 text-primary font-bold">
                                            <ClockIcon className="h-4 w-4" />
                                            <span>{formatCallDate(company.scheduledAt)}</span>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium mt-0.5">
                                            Scheduled
                                        </span>
                                    </div>
                                    <button className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md">
                                        <MicIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

