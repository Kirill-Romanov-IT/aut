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
type CompanyStatus = "call-back" | "decision-maker"

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

// --- Mock Data ---
const MOCK_COMPANIES: Company[] = [
    { id: "1", name: "Global Solution", location: "Moscow", employees: 120, status: "call-back" },
    { id: "2", name: "Tech Innovators", location: "St. Petersburg", employees: 45, status: "decision-maker" },
    { id: "3", name: "SoftServe", location: "Kazan", employees: 200, status: "call-back" },
    { id: "4", name: "NextGen", location: "Novosibirsk", employees: 15, status: "decision-maker" },
    { id: "5", name: "Alpha Group", location: "Yekaterinburg", employees: 500, status: "call-back" },
    { id: "6", name: "Omega Corp", location: "Samara", employees: 100, status: "decision-maker" },
    { id: "7", name: "Delta Systems", location: "Omsk", employees: 50, status: "decision-maker" },
    { id: "8", name: "Zeta Inc", location: "Ufa", employees: 300, status: "call-back" },
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

    // We use CSS.Transform to avoid layout shifts when dragging.
    // CSS.Translate is generally better for performance but might not handle everything.
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
                        <CardTitle className="text-base font-medium">{company.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px]">{company.employees} emp.</Badge>
                    </div>
                    <CardDescription className="text-xs line-clamp-1">{company.location}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {/* Placeholder for contact info */}
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                            CP
                        </div>
                        <span>Contact Person</span>
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
                <h3 className="font-semibold leading-none tracking-tight">{column.title}</h3>
                <Badge variant="secondary">{companies.length}</Badge>
            </div>
            <div className="flex-1 overflow-y-auto pr-2">
                <SortableContext items={companies.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    <div ref={setNodeRef} className="flex flex-col gap-3 min-h-[200px] p-1">
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
        <Card className="cursor-grabbing shadow-lg w-[300px] opacity-90 ring-2 ring-primary">
            <CardHeader className="p-4 pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-medium">{company.name}</CardTitle>
                    <Badge variant="outline" className="text-[10px]">{company.employees} emp.</Badge>
                </div>
                <CardDescription className="text-xs line-clamp-1">{company.location}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        CP
                    </div>
                    <span>Contact Person</span>
                </div>
            </CardContent>
        </Card>
    )
}

export function LifecycleKanban() {
    const [companies, setCompanies] = React.useState<Company[]>(MOCK_COMPANIES)
    const [activeId, setActiveId] = React.useState<string | null>(null)

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
        { id: "call-back", title: "Перезвонить позже" },
        { id: "decision-maker", title: "Известен ЛПР" }
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

        // Scenario 1: Dragging over another company
        if (isActiveACompany && isOverACompany) {
            setCompanies((companies) => {
                const activeIndex = companies.findIndex((c) => c.id === activeId)
                const overIndex = companies.findIndex((c) => c.id === overId)

                const newCompanies = [...companies];
                // Update status if moving to a company in a different column
                if (companies[activeIndex].status !== companies[overIndex].status) {
                    newCompanies[activeIndex].status = companies[overIndex].status
                }

                return arrayMove(newCompanies, activeIndex, overIndex)
            })
        }

        // Scenario 2: Dragging over a column container (dropping into empty space or column header)
        if (isActiveACompany && isOverAColumn) {
            const overColumnId = overId as CompanyStatus;
            setCompanies((companies) => {
                const activeIndex = companies.findIndex((c) => c.id === activeId)

                if (companies[activeIndex].status !== overColumnId) {
                    const newCompanies = [...companies];
                    newCompanies[activeIndex].status = overColumnId
                    // Move to the end of that column visually is handled by sortable strategy implicitly if we reorder
                    // But since we just change status, arrayMove isn't strictly needed unless we want to control position.
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

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full items-start">
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

// Helper needed because useDroppable isn't exported directly from SortableContext for columns usually, 
// but we used useDroppable in KanbanColumn directly.
import { useDroppable } from "@dnd-kit/core"
