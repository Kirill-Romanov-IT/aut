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

// --- Types ---
type CompanyStatus = "not-responding" | "ivr" | "hang-up" | "dm-found-call-time"

type Company = {
    id: string
    name: string
    location: string
    employees: number
    status: CompanyStatus
}

type Column = {
    id: CompanyStatus
    title: string
}

const STORAGE_KEY = "lifecycle-kanban-state"

// --- Mock Data ---
const MOCK_COMPANIES: Company[] = [
    { id: "1", name: "Global Solution", location: "Moscow", employees: 120, status: "not-responding" },
    { id: "2", name: "Tech Innovators", location: "St. Petersburg", employees: 45, status: "ivr" },
    { id: "3", name: "SoftServe", location: "Kazan", employees: 200, status: "hang-up" },
    { id: "4", name: "NextGen", location: "Novosibirsk", employees: 15, status: "dm-found-call-time" },
    { id: "5", name: "Alpha Group", location: "Yekaterinburg", employees: 500, status: "not-responding" },
    { id: "6", name: "Omega Corp", location: "Samara", employees: 100, status: "ivr" },
    { id: "7", name: "Delta Systems", location: "Omsk", employees: 50, status: "hang-up" },
    { id: "8", name: "Zeta Inc", location: "Ufa", employees: 300, status: "dm-found-call-time" },
    { id: "9", name: "Beta LLC", location: "Perm", employees: 80, status: "not-responding" },
    { id: "10", name: "Gamma Ltd", location: "Voronezh", employees: 60, status: "ivr" },
]

// --- Components ---

function SortableCompanyCard({ company }: { company: Company }) {
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
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="touch-none">
            <Card className="cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow">
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

function KanbanColumn({ column, companies }: { column: Column, companies: Company[] }) {
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
                            <SortableCompanyCard key={company.id} company={company} />
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

    // Hydration fix & LocalStorage Load
    React.useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY)
        if (saved) {
            try {
                setCompanies(JSON.parse(saved))
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
        { id: "not-responding", title: "Не отвечает" },
        { id: "ivr", title: "IVR" },
        { id: "hang-up", title: "Дозванились но бросает трубку" },
        { id: "dm-found-call-time", title: "Выяснили кто принимает решение - звонить по времени" }
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
                {/* Placeholder to avoid jump */}
                {columns.map(col => (
                    <div key={col.id} className="rounded-xl bg-muted/40 p-4 border h-[500px]" />
                ))}
            </div>
        )
    }

    return (
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
                    />
                ))}
            </div>

            <DragOverlay>
                {activeCompany ? <DragOverlayCard company={activeCompany} /> : null}
            </DragOverlay>
        </DndContext>
    )
}

