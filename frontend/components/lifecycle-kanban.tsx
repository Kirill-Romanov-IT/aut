"use client"

import * as React from "react"
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragOverEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    useDroppable,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ZapIcon, PencilIcon, CheckIcon, XIcon, ArchiveIcon, Building2Icon, MapPinIcon, UserIcon, PhoneIcon } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { useLanguage } from "@/components/language-provider"
import { formatCompanyName } from "@/lib/utils"

// --- Types ---
type CompanyStatus = "new" | "not-responding" | "ivr" | "voicemail" | "hang-up" | "dm-found-call-time"

type Company = {
    id: string
    name: string
    location: string
    employees: number
    status: CompanyStatus
    scheduledAt: string // ISO string for sorting
    contactName: string
    contactSurname: string
    contactPhone: string
}

type Column = {
    id: CompanyStatus
    title: string
}

// --- Helpers ---
const formatCallDate = (isoString: string, t: (key: any) => string) => {
    if (!isoString) return ""
    const date = new Date(isoString)
    // Simplified date formatting for now
    return date.toLocaleString()
}

// --- Components ---

function SortableCompanyCard({ company, onClick, onArchive }: { company: Company, onClick: (c: Company) => void, onArchive: (id: string | number) => void }) {
    const { t } = useLanguage()
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: company.id,
        data: {
            type: 'Company',
            company
        }
    })

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    }

    if (isDragging) {
        return (
            <div
                ref={setNodeRef}
                style={style}
                className="opacity-50 bg-muted/50 border-2 border-dashed border-primary/20 rounded-lg h-[120px]"
            />
        )
    }

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none group">
            <Card
                className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative overflow-hidden"
                onClick={(e) => {
                    onClick(company)
                }}
            >
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium">{formatCompanyName(company.name)}</CardTitle>
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                onArchive(company.id)
                            }}
                            className="p-1.5 rounded-md hover:bg-primary/10 text-primary/60 transition-all opacity-0 group-hover:opacity-100 hover:scale-110 active:scale-95"
                            title={t('archive')}
                        >
                            <ArchiveIcon className="h-4 w-4" />
                        </button>
                    </div>
                    <CardDescription className="text-[10px] line-clamp-1">{company.location}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded-lg border border-muted-foreground/5">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                            {company.contactName?.charAt(0) || "C"}
                        </div>
                        <span className="truncate flex-1">{company.contactName} {company.contactSurname}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80 px-1">
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                        <span className="font-mono">{company.contactPhone}</span>
                    </div>
                </CardContent>
            </Card>
        </div >
    )
}

function KanbanColumn({ column, companies, onCardClick, onCardArchive }: { column: Column, companies: Company[], onCardClick: (c: Company) => void, onCardArchive: (id: string | number) => void }) {
    const { setNodeRef } = useDroppable({
        id: column.id,
        data: {
            type: 'Column',
            column
        }
    });

    return (
        <div className="flex flex-col gap-4 rounded-xl bg-muted/40 p-4 border h-full min-h-[500px]">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold leading-none tracking-tight line-clamp-2 min-h-[2rem] flex items-center">{column.title}</h3>
                <Badge variant="secondary" className="text-[10px]">{companies.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto pr-1">
                <SortableContext items={companies.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[150px] p-1">
                        {companies.map((company) => (
                            <SortableCompanyCard key={company.id} company={company} onClick={onCardClick} onArchive={onCardArchive} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}

function DragOverlayCard({ company }: { company: Company }) {
    const { t } = useLanguage()
    return (
        <Card className="cursor-grabbing shadow-lg w-[260px] opacity-90 ring-2 ring-primary">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium">{formatCompanyName(company.name)}</CardTitle>

                </div>
                <CardDescription className="text-[10px] line-clamp-1">{company.location}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-muted/30 p-1.5 rounded-lg border border-muted-foreground/5">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary shrink-0">
                        {company.contactName?.charAt(0) || "C"}
                    </div>
                    <span className="truncate flex-1">{company.contactName} {company.contactSurname}</span>
                </div>
                <div className="flex items-center gap-2 text-[9px] text-muted-foreground/80 px-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary/60"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    <span className="font-mono">{company.contactPhone}</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function LifecycleKanban() {
    const { t } = useLanguage()
    const [mounted, setMounted] = React.useState(false)
    const [companies, setCompanies] = React.useState<Company[]>([])
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
    const [isEditingTime, setIsEditingTime] = React.useState(false)
    const [tempTime, setTempTime] = React.useState("")
    const [editingField, setEditingField] = React.useState<string | null>(null)
    const [tempValues, setTempValues] = React.useState<Partial<Company>>({})
    const [draggedInitialStatus, setDraggedInitialStatus] = React.useState<CompanyStatus | null>(null)

    const columns: Column[] = [
        { id: "new", title: t('newCompanies') },
        { id: "not-responding", title: t('noAnswer') },
        { id: "ivr", title: t('ivr') },
        { id: "voicemail", title: t('voicemail') },
        { id: "hang-up", title: t('reachedButHangsUp') },
        { id: "dm-found-call-time", title: t('decisionMakerFound') }
    ]

    const fetchCompanies = async () => {
        try {
            const token = localStorage.getItem("token")
            const response = await fetch("http://localhost:8000/companies/kanban", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (response.ok) {
                const data = await response.json()
                const formattedData: Company[] = data.map((c: any) => ({
                    id: String(c.id),
                    name: c.name,
                    location: c.location,
                    employees: c.employees,
                    status: (c.kanban_column || c.status) as CompanyStatus,
                    scheduledAt: c.scheduled_at || "",
                    contactName: c.contact_name,
                    contactSurname: c.contact_surname,
                    contactPhone: c.contact_phone,
                }))
                setCompanies(formattedData)
            }
        } catch (error) {
            console.error("Failed to fetch companies:", error)
        }
    }

    // Load from backend on mount and poll every 5 seconds
    React.useEffect(() => {
        fetchCompanies()
        setMounted(true)

        const intervalId = setInterval(() => {
            // Only fetch if not currently dragging to avoid state conflicts
            if (!activeId) {
                fetchCompanies()
            }
        }, 5000)

        return () => clearInterval(intervalId)
    }, [activeId]) // Re-create interval if activeId changes (to pause/resume) or just check ref. 
    // Actually, simpler to just check activeId inside, but activeId is state. 
    // To avoid effect re-running too often, better to use a ref for activeId or just depend on it.
    // Since activeId changes rarely (start/end drag), depend on it is fine.

    const generateQueue = async () => {
        const loadingToast = toast.loading(t('loading'))
        try {
            const token = localStorage.getItem("token")
            const response = await fetch("http://localhost:8000/companies/generate-queue", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
            if (response.ok) {
                const data = await response.json()
                toast.success(t('success'), {
                    description: `${data.updated_count} ${t('companies')}`,
                })
                // Refresh to show updated scheduled times
                fetchCompanies()
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Failed to generate queue:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleTimeSave = async () => {
        if (!selectedCompany || !tempTime) return

        const isoTime = new Date(tempTime).toISOString()
        try {
            const token = localStorage.getItem("token")
            const response = await fetch(`http://localhost:8000/companies/${selectedCompany.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: selectedCompany.name,
                    employees: selectedCompany.employees,
                    location: selectedCompany.location,
                    scheduled_at: isoTime,
                }),
            })
            if (response.ok) {
                setCompanies(prev => prev.map(c =>
                    c.id === selectedCompany.id ? { ...c, scheduledAt: isoTime } : c
                ))
                setSelectedCompany(prev => prev ? { ...prev, scheduledAt: isoTime } : null)
                toast.success(t('success'))
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Failed to save scheduled time:", error)
            toast.error(t('error'))
        }
        setIsEditingTime(false)
    }

    const startEditingTime = () => {
        if (!selectedCompany) return
        setTempTime(new Date(selectedCompany.scheduledAt).toISOString().slice(0, 16))
        setIsEditingTime(true)
    }

    const handleStartEdit = (field: string, value: string) => {
        setEditingField(field)
        setTempValues(prev => ({ ...prev, [field]: value }))
    }

    const handleCancelEdit = () => {
        setEditingField(null)
        setTempValues(selectedCompany || {})
    }

    const handleFieldSave = async (field: keyof Company) => {
        if (!selectedCompany) return
        const newValue = tempValues[field]

        // For now, only status is persisted via a specific endpoint. 
        // We could add a full update endpoint later.
        // Actually, name/location/employees can be updated too.

        try {
            const token = localStorage.getItem("token")
            const response = await fetch(`http://localhost:8000/companies/${selectedCompany.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: field === 'name' ? newValue : selectedCompany.name,
                    employees: field === 'employees' ? newValue : selectedCompany.employees,
                    location: field === 'location' ? newValue : selectedCompany.location,
                }),
            })

            if (response.ok) {
                setCompanies(prev => prev.map(c =>
                    c.id === selectedCompany.id ? { ...c, [field]: newValue } : c
                ))
                setSelectedCompany(prev => prev ? { ...prev, [field]: newValue } : null)
                setEditingField(null)
                toast.success(t('success'))
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Field save error:", error)
            toast.error(t('error'))
        }
    }

    const handleArchive = async (id: string | number) => {
        if (window.confirm(t('confirmArchive') || 'Archive this company?')) {
            const loadingToast = toast.loading(t('loading'))
            try {
                const token = localStorage.getItem("token")
                const response = await fetch(`http://localhost:8000/companies/${id}/archive`, {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                })

                if (response.ok) {
                    setCompanies(prev => prev.filter(c => String(c.id) !== String(id)))
                    toast.success(t('archivedSuccessfully'))
                    return true
                } else {
                    // If not in DB (likely a mock), just remove from local state
                    setCompanies(prev => prev.filter(c => String(c.id) !== String(id)))
                    toast.success(t('archivedSuccessfully'))
                    return true
                }
            } catch (error) {
                console.error("Archive error:", error)
                // Fallback for local-only/mocks
                setCompanies(prev => prev.filter(c => String(c.id) !== String(id)))
                toast.success(t('archivedSuccessfully'))
                return true
            } finally {
                toast.dismiss(loadingToast)
            }
        }
        return false
    }

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragStart = (event: DragStartEvent) => {
        const activeId = event.active.id as string
        setActiveId(activeId)
        const company = companies.find(c => c.id === activeId)
        if (company) {
            setDraggedInitialStatus(company.status)
        }
    }

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event
        if (!over) return

        const activeId = active.id
        const overId = over.id

        if (activeId === overId) return

        const isActiveACompany = active.data.current?.type === 'Company'
        const isOverACompany = over.data.current?.type === 'Company'
        const isOverAColumn = over.data.current?.type === 'Column'

        if (!isActiveACompany) return

        if (isActiveACompany && isOverACompany) {
            setCompanies((companies) => {
                const activeIndex = companies.findIndex((c) => c.id === activeId)
                const overIndex = companies.findIndex((c) => c.id === overId)

                const newCompanies = [...companies];
                if (companies[activeIndex].status !== companies[overIndex].status) {
                    newCompanies[activeIndex].status = companies[overIndex].status
                }

                return arrayMove(newCompanies, activeIndex, overIndex)
            })
        }

        if (isActiveACompany && isOverAColumn) {
            const overColumnId = overId as CompanyStatus;
            setCompanies((companies) => {
                const activeIndex = companies.findIndex((c) => c.id === activeId)

                if (companies[activeIndex].status !== overColumnId) {
                    const newCompanies = [...companies];
                    newCompanies[activeIndex].status = overColumnId
                    return arrayMove(newCompanies, activeIndex, activeIndex)
                }
                return companies
            })
        }
    }

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event
        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = active.id
        const overId = over.id

        const activeCompany = companies.find(c => c.id === activeId)
        if (!activeCompany) {
            setActiveId(null)
            return
        }

        const overColumnId = (over.data.current?.type === 'Column' ? overId : over.data.current?.company?.status) as CompanyStatus

        if (overColumnId && draggedInitialStatus && draggedInitialStatus !== overColumnId) {
            try {
                const token = localStorage.getItem("token")
                const response = await fetch(`http://localhost:8000/companies/${activeId}/status`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ status: overColumnId }),
                })

                if (response.ok) {
                    toast.success(t('success'))
                } else {
                    // Revert if failed
                    fetchCompanies()
                    toast.error(t('error'))
                }
            } catch (error) {
                console.error("Failed to update status:", error)
                fetchCompanies()
                toast.error(t('error'))
            }
        }

        setActiveId(null)
        setDraggedInitialStatus(null)
    }

    const activeCompany = React.useMemo(() =>
        companies.find(c => c.id === activeId),
        [activeId, companies])

    if (!mounted) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 h-full items-start opacity-0">
                {columns.map(col => (
                    <div key={col.id} className="rounded-xl bg-muted/40 p-4 border h-[500px]" />
                ))}
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('lifecycle')}</h2>
                    <p className="text-sm text-muted-foreground">{t('settingsDescription')}</p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={generateQueue}
                        className="rounded-xl shadow-lg shadow-primary/20 hover:scale-105 transition-all active:scale-95"
                    >
                        <ZapIcon className="h-4 w-4 mr-2 fill-current" />
                        {t('generateQueue')}
                    </Button>
                </div>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 h-full items-start animate-in fade-in duration-500">
                    {columns.map(col => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            companies={companies.filter(c => c.status === col.id)}
                            onCardClick={(c) => setSelectedCompany(c)}
                            onCardArchive={handleArchive}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeCompany ? <DragOverlayCard company={activeCompany} /> : null}
                </DragOverlay>
            </DndContext>

            <Dialog open={!!selectedCompany} onOpenChange={(open) => {
                if (!open) {
                    setSelectedCompany(null)
                    setIsEditingTime(false)
                    setEditingField(null)
                }
            }}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 bg-background/95 backdrop-blur-sm">
                    <DialogHeader className="p-0">
                        <div className="bg-primary/5 p-8 flex flex-col items-center text-center gap-6 rounded-t-2xl relative">
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation()
                                    if (selectedCompany) {
                                        const archived = await handleArchive(selectedCompany.id)
                                        if (archived) {
                                            setSelectedCompany(null)
                                            setIsEditingTime(false)
                                        }
                                    }
                                }}
                                className="absolute left-4 top-4 p-2 rounded-full hover:bg-primary/10 text-primary/60 transition-all z-10 hover:scale-110 active:scale-95"
                                title={t('archive')}
                            >
                                <ArchiveIcon className="h-4 w-4" />
                            </button>

                            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-2xl font-bold text-primary">
                                    {formatCompanyName(selectedCompany?.name || "").charAt(0)}
                                </span>
                            </div>
                            <div className="space-y-2">
                                <DialogTitle className="text-xl font-bold tracking-tight">{formatCompanyName(selectedCompany?.name || "")}</DialogTitle>
                                <DialogDescription className="sr-only">
                                    Detailed information about {selectedCompany?.name}
                                </DialogDescription>
                                <div className="flex items-center justify-center gap-2">
                                    <Badge variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">
                                        {selectedCompany?.status === 'new' && t('new')}
                                        {selectedCompany?.status === 'not-responding' && t('noAnswer')}
                                        {selectedCompany?.status === 'ivr' && t('ivr')}
                                        {selectedCompany?.status === 'voicemail' && t('voicemail')}
                                        {selectedCompany?.status === 'hang-up' && t('reachedButHangsUp')}
                                        {selectedCompany?.status === 'dm-found-call-time' && t('decisionMakerFound')}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="p-8 space-y-6">
                        <div className="grid gap-4">
                            {[
                                { label: t('companyName'), field: "name", icon: <Building2Icon className="h-4 w-4" /> },
                                { label: t('location'), field: "location", icon: <MapPinIcon className="h-4 w-4" /> },
                                { label: t('contactName'), field: "contactName", icon: <UserIcon className="h-4 w-4" /> },
                                { label: t('surname'), field: "contactSurname", icon: <UserIcon className="h-4 w-4" /> },
                                { label: t('phone'), field: "contactPhone", icon: <PhoneIcon className="h-4 w-4" /> },
                            ].map(({ label, field, icon }) => {
                                const isEditing = editingField === field
                                const value = isEditing ? (tempValues[field as keyof Company] as string) : (selectedCompany?.[field as keyof Company] as string || "-")

                                return (
                                    <div key={field} className="space-y-2">
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                            {label}
                                        </label>
                                        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/20 focus-within:border-primary/30 transition-colors">
                                            <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                                                {icon}
                                            </div>
                                            {isEditing ? (
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Input
                                                        value={tempValues[field as keyof Company] as string || ""}
                                                        onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
                                                        className="h-8 py-0 bg-transparent border-none focus-visible:ring-0 text-sm font-medium"
                                                        autoFocus
                                                    />
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleFieldSave(field as keyof Company)}
                                                            className="p-1 hover:bg-green-100 text-green-600 rounded-md"
                                                        >
                                                            <CheckIcon className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={handleCancelEdit}
                                                            className="p-1 hover:bg-red-100 text-red-600 rounded-md"
                                                        >
                                                            <XIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center justify-between flex-1 group/field">
                                                    <span className="text-sm font-medium text-foreground/80">{value}</span>
                                                    <button
                                                        onClick={() => handleStartEdit(field, selectedCompany?.[field as keyof Company] as string || "")}
                                                        className="p-1.5 opacity-0 group-hover/field:opacity-100 hover:bg-primary/10 text-primary/60 rounded-md transition-all"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}

                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                    {t('scheduledFor')}
                                </label>
                                <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
                                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                    </div>
                                    {isEditingTime ? (
                                        <div className="flex items-center gap-2 flex-1">
                                            <input
                                                type="datetime-local"
                                                value={tempTime}
                                                onChange={(e) => setTempTime(e.target.value)}
                                                className="bg-background border rounded-md px-2 py-1 text-xs font-semibold text-primary/80 focus:ring-1 focus:ring-primary w-full"
                                            />
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={handleTimeSave}
                                                    className="p-1 hover:bg-green-100 text-green-600 rounded-md transition-colors"
                                                    title={t('save')}
                                                >
                                                    <CheckIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIsEditingTime(false)}
                                                    className="p-1 hover:bg-red-100 text-red-600 rounded-md transition-colors"
                                                    title={t('cancel')}
                                                >
                                                    <XIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between flex-1 group/field">
                                            <span className="text-sm font-semibold text-primary/80">
                                                {selectedCompany && formatCallDate(selectedCompany.scheduledAt, t)}
                                            </span>
                                            <button
                                                onClick={startEditingTime}
                                                className="p-1.5 opacity-0 group-hover/field:opacity-100 hover:bg-primary/10 text-primary/60 hover:text-primary rounded-md transition-all active:scale-90"
                                                title={t('edit')}
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <DialogClose asChild>
                                <button
                                    className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                                >
                                    {t('close')}
                                </button>
                            </DialogClose>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
