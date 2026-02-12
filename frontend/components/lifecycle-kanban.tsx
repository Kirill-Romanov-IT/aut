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
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"

// --- Types ---
type CompanyStatus = "not-responding" | "ivr" | "hang-up" | "dm-found-call-time"

type Company = {
    id: string
    name: string
    location: string
    employees: number
    status: CompanyStatus
    scheduledAt: string // ISO string for sorting
}

type Column = {
    id: CompanyStatus
    title: string
}

const STORAGE_KEY = "lifecycle-kanban-state"

// --- Helpers ---
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

const generateRandomCallDate = () => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000) // Next 10 days
    futureDate.setHours(Math.floor(Math.random() * 12) + 9, Math.random() > 0.5 ? 0 : 30, 0, 0)
    return futureDate.toISOString()
}

// --- Mock Data ---
const MOCK_COMPANIES: Company[] = [
    { id: "1", name: "Vladislav Sayko", location: "Moscow", employees: 120, status: "not-responding", scheduledAt: generateRandomCallDate() },
    { id: "2", name: "Global Solution", location: "St. Petersburg", employees: 45, status: "ivr", scheduledAt: generateRandomCallDate() },
    { id: "3", name: "Tech Innovators", location: "Kazan", employees: 200, status: "hang-up", scheduledAt: generateRandomCallDate() },
    { id: "4", name: "SoftServe", location: "Novosibirsk", employees: 15, status: "dm-found-call-time", scheduledAt: generateRandomCallDate() },
    { id: "5", name: "NextGen", location: "Yekaterinburg", employees: 500, status: "not-responding", scheduledAt: generateRandomCallDate() },
    { id: "6", name: "Alpha Group", location: "Samara", employees: 100, status: "ivr", scheduledAt: generateRandomCallDate() },
    { id: "7", name: "Omega Corp", location: "Omsk", employees: 50, status: "hang-up", scheduledAt: generateRandomCallDate() },
    { id: "8", name: "Delta Systems", location: "Ufa", employees: 300, status: "dm-found-call-time", scheduledAt: generateRandomCallDate() },
    { id: "9", name: "Zeta Inc", location: "Perm", employees: 80, status: "not-responding", scheduledAt: generateRandomCallDate() },
    { id: "10", name: "Beta LLC", location: "Voronezh", employees: 60, status: "ivr", scheduledAt: generateRandomCallDate() },
]

// --- Components ---

function SortableCompanyCard({ company, onClick }: { company: Company, onClick: (c: Company) => void }) {
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
                className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative"
                onClick={(e) => {
                    // Only trigger click if not dragging
                    // attributes/listeners handle drag, but we want a way to click.
                    // dnd-kit pointer sensor has distance constraint, so we can detect real clicks.
                    onClick(company)
                }}
            >
                <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                        <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] whitespace-nowrap">{company.employees} emp.</Badge>
                    </div>
                    <CardDescription className="text-[10px] line-clamp-1">{company.location}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                            CP
                        </div>
                        <span className="truncate">Contact Person</span>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function KanbanColumn({ column, companies, onCardClick }: { column: Column, companies: Company[], onCardClick: (c: Company) => void }) {
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
                            <SortableCompanyCard key={company.id} company={company} onClick={onCardClick} />
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    )
}

function DragOverlayCard({ company }: { company: Company }) {
    return (
        <Card className="cursor-grabbing shadow-lg w-[260px] opacity-90 ring-2 ring-primary">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium">{company.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px] whitespace-nowrap">{company.employees} emp.</Badge>
                </div>
                <CardDescription className="text-[10px] line-clamp-1">{company.location}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-bold text-primary">
                        CP
                    </div>
                    <span className="truncate">Contact Person</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function LifecycleKanban() {
    const [mounted, setMounted] = React.useState(false)
    const [companies, setCompanies] = React.useState<Company[]>(MOCK_COMPANIES)
    const [activeId, setActiveId] = React.useState<string | null>(null)
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)

    // Hydration fix & LocalStorage Load
    React.useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                const parsed = JSON.parse(saved)
                // Ensure all loaded companies have a scheduledAt date and it's ISO
                const validated = parsed.map((c: any) => ({
                    ...c,
                    scheduledAt: (c.scheduledAt && c.scheduledAt.includes('T')) ? c.scheduledAt : generateRandomCallDate()
                }))
                setCompanies(validated)
            } catch (e) {
                console.error("Failed to load kanban state", e)
            }
        }
        setMounted(true)
    }, [])

    // LocalStorage Save
    React.useEffect(() => {
        if (mounted) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(companies))
        }
    }, [companies, mounted])

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

    const columns: Column[] = [
        { id: "not-responding", title: "No Answer" },
        { id: "ivr", title: "IVR" },
        { id: "hang-up", title: "Reached but Hangs up" },
        { id: "dm-found-call-time", title: "Decision Maker Found - Call at Time" }
    ]

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string)
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

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null)
    }

    const activeCompany = React.useMemo(() =>
        companies.find(c => c.id === activeId),
        [activeId, companies])

    if (!mounted) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full items-start opacity-0">
                {columns.map(col => (
                    <div key={col.id} className="rounded-xl bg-muted/40 p-4 border h-[500px]" />
                ))}
            </div>
        )
    }

    return (
        <>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 h-full items-start animate-in fade-in duration-500">
                    {columns.map(col => (
                        <KanbanColumn
                            key={col.id}
                            column={col}
                            companies={companies.filter(c => c.status === col.id)}
                            onCardClick={(c) => setSelectedCompany(c)}
                        />
                    ))}
                </div>

                <DragOverlay>
                    {activeCompany ? <DragOverlayCard company={activeCompany} /> : null}
                </DragOverlay>
            </DndContext>

            <Dialog open={!!selectedCompany} onOpenChange={(open) => !open && setSelectedCompany(null)}>
                <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
                    <div className="bg-primary/5 p-8 flex flex-col items-center text-center gap-6">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                                {selectedCompany?.name.charAt(0)}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-bold tracking-tight">{selectedCompany?.name}</DialogTitle>
                            <DialogDescription className="sr-only">
                                Detailed information about {selectedCompany?.name}
                            </DialogDescription>
                            <div className="flex items-center justify-center gap-2">
                                <Badge variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">
                                    {selectedCompany?.status === 'not-responding' && "No Answer"}
                                    {selectedCompany?.status === 'ivr' && "IVR"}
                                    {selectedCompany?.status === 'hang-up' && "Hang Up"}
                                    {selectedCompany?.status === 'dm-found-call-time' && "DM Found"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                                Scheduled for:
                            </label>
                            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                </div>
                                <span className="text-sm font-semibold text-primary/80">
                                    {selectedCompany && formatCallDate(selectedCompany.scheduledAt)}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedCompany(null)}
                            className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                        >
                            Close
                        </button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
