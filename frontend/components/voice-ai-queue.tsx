"use client"

import * as React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ClockIcon, UserIcon, MapPinIcon, MicIcon, Trash2Icon, SendIcon } from "lucide-react"
import { useLanguage } from "@/components/language-provider"
import { toast } from "sonner"

type CompanyStatus = "new" | "not-responding" | "ivr" | "hang-up" | "dm-found-call-time" | "sent"

type Company = {
    id: string
    name: string
    location: string
    employees: number
    status: CompanyStatus
    scheduledAt: string
    contactName: string
    contactSurname: string
    contactPhone: string
}

const formatCallDate = (isoString: string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    return date.toLocaleString()
}

const getStatusBadge = (status: CompanyStatus, t: (key: any) => string) => {
    switch (status) {
        case "new": return <Badge variant="outline" className="border-purple-200 bg-purple-50 text-purple-700">{t('new')}</Badge>
        case "not-responding": return <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700">{t('noAnswer')}</Badge>
        case "ivr": return <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{t('ivr')}</Badge>
        case "hang-up": return <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">{t('reachedButHangsUp')}</Badge>
        case "dm-found-call-time": return <Badge variant="outline" className="border-green-200 bg-green-50 text-green-700">{t('decisionMakerFound')}</Badge>
        case "sent": return <Badge variant="outline" className="border-gray-200 bg-gray-50 text-gray-700">{t('sent')}</Badge>
        default: return <Badge variant="outline">{status}</Badge>
    }
}

export function VoiceAIQueue() {
    const { t } = useLanguage()
    const [mounted, setMounted] = React.useState(false)
    const [companies, setCompanies] = React.useState<Company[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const [isSending, setIsSending] = React.useState(false)

    const fetchQueue = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) return

            const response = await fetch("http://localhost:8000/companies/call-queue", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                const formatted: Company[] = data.map((c: any) => ({
                    id: String(c.id),
                    name: c.name,
                    location: c.location || "",
                    employees: c.employees || 0,
                    status: (c.kanban_column || c.status) as CompanyStatus,
                    scheduledAt: c.scheduled_at || "",
                    contactName: c.contact_name || "",
                    contactSurname: c.contact_surname || "",
                    contactPhone: c.contact_phone || "",
                }))
                // Sort by scheduledAt (earliest first)
                formatted.sort((a, b) =>
                    new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
                )
                setCompanies(formatted)
            }
        } catch (error) {
            console.error("Failed to fetch call queue:", error)
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        setMounted(true)
        fetchQueue()
    }, [fetchQueue])

    const handleClearQueue = () => {
        setCompanies([])
        toast.success(t('success'))
    }

    const handleSendList = async () => {
        if (companies.length === 0) return
        setIsSending(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) return

            const response = await fetch("http://localhost:8000/companies/send-call-queue", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    company_ids: companies.map(c => parseInt(c.id)),
                }),
            })

            if (response.ok) {
                const result = await response.json()
                toast.success(`${t('listSentSuccessfully')} (${result.sent_count})`)
                // Refresh queue — sent companies no longer have scheduled_at
                await fetchQueue()
            } else {
                const err = await response.json().catch(() => null)
                toast.error(err?.detail || t('error'))
            }
        } catch (error) {
            console.error("Failed to send list:", error)
            toast.error(t('error'))
        } finally {
            setIsSending(false)
        }
    }

    if (!mounted) return null

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between space-y-0">
                <div>
                    <CardTitle className="text-2xl font-bold tracking-tight">{t('voiceAiQueueTitle')}</CardTitle>
                    <p className="text-sm text-muted-foreground">{t('upcomingCalls')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearQueue}
                        disabled={companies.length === 0}
                        className="rounded-xl transition-all active:scale-95"
                    >
                        <Trash2Icon className="h-4 w-4 mr-2" />
                        {t('clearQueue')}
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleSendList}
                        disabled={isSending || companies.length === 0}
                        className="h-8 rounded-md bg-[#020817] text-white hover:bg-[#020817]/90 transition-all active:scale-95 disabled:opacity-50 px-4 flex items-center gap-2 text-sm font-medium border-none shadow-sm"
                    >
                        <SendIcon className={`h-4 w-4 ${isSending ? 'animate-pulse' : ''}`} />
                        {isSending ? t('sendingList') : t('sendList')}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="px-0">
                <div className="space-y-4">
                    {isLoading && companies.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                            <p className="text-muted-foreground">{t('loading')}</p>
                        </div>
                    ) : companies.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-2xl border-2 border-dashed border-muted">
                            <p className="text-muted-foreground">{t('queueEmpty')}</p>
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
                                                {company.contactName} {company.contactSurname}
                                            </div>
                                            {getStatusBadge(company.status, t)}
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
                                            {t('scheduledLabel')}
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
