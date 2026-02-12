"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { MoreVertical, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Search } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

import { ReadyCompanyDialog } from "./ready-company-dialog"

export type ReadyCompany = {
    id: number | string
    company_name: string
    location: string
    name: string
    sur_name: string
    phone_number: string
    created_at?: string
}

export interface ReadyCompaniesTableProps {
    companies: ReadyCompany[]
    isLoading: boolean
    onUpdate: () => void
}

export function ReadyCompaniesTable({
    companies,
    isLoading,
    onUpdate
}: ReadyCompaniesTableProps) {
    const router = useRouter()
    const [selectedIds, setSelectedIds] = React.useState<Set<number | string>>(new Set())
    const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null })
    const [filters, setFilters] = React.useState({ company_name: '', location: '', name: '', sur_name: '', phone_number: '' })
    const [selectedDetailCompany, setSelectedDetailCompany] = React.useState<ReadyCompany | null>(null)

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' | null = 'asc'
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc'
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null
        }
        setSortConfig({ key, direction })
    }

    const handleFilterChange = (key: string, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    React.useEffect(() => {
        if (selectedDetailCompany) {
            const updated = companies.find(c => c.id === selectedDetailCompany.id)
            if (updated) {
                setSelectedDetailCompany(updated)
            }
        }
    }, [companies, selectedDetailCompany]) // Added selectedDetailCompany to dependencies to prevent stale closure issues

    const filteredAndSorted = React.useMemo(() => {
        let result = [...companies]

        // Filtering
        Object.keys(filters).forEach((key) => {
            const filterValue = filters[key as keyof typeof filters]
            if (filterValue) {
                result = result.filter(c => {
                    const val = c[key as keyof ReadyCompany]
                    return val && val.toString().toLowerCase().includes(filterValue.toLowerCase())
                })
            }
        })

        // Sorting
        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof ReadyCompany] || ''
                const bValue = b[sortConfig.key as keyof ReadyCompany] || ''

                if (aValue === bValue) return 0
                const comparison = aValue > bValue ? 1 : -1
                return sortConfig.direction === 'asc' ? comparison : -comparison
            })
        }

        return result
    }, [companies, sortConfig, filters])

    const handleBulkMoveToKanban = async () => {
        if (selectedIds.size === 0) return

        const loadingToast = toast.loading(`Moving ${selectedIds.size} companies to Kanban...`)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/ready-companies/bulk-move-to-kanban", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(Array.from(selectedIds)),
            })

            if (response.ok) {
                const movedCompanies = await response.json()

                // Sync with Kanban localStorage
                const kanbanData = localStorage.getItem("lifecycle-kanban-state")
                const currentKanban = kanbanData ? JSON.parse(kanbanData) : []

                const newKanbanCompanies = movedCompanies.map((comp: any) => ({
                    id: comp.id.toString(),
                    name: comp.name,
                    location: comp.location || "",
                    employees: comp.employees || 0,
                    status: comp.status || "new",
                    scheduledAt: comp.scheduled_at || new Date().toISOString()
                }))

                localStorage.setItem("lifecycle-kanban-state", JSON.stringify([...currentKanban, ...newKanbanCompanies]))

                toast.success(`Successfully moved ${selectedIds.size} companies to Kanban`)
                setSelectedIds(new Set())
                onUpdate()
            } else {
                const error = await response.json()
                toast.error(error.detail || "Failed to move companies")
            }
        } catch (error) {
            console.error("Bulk move error:", error)
            toast.error("An error occurred")
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.size} ready companies?`)
        if (!confirmDelete) return

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/ready-companies/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(Array.from(selectedIds)),
            })

            if (response.ok) {
                toast.success(`Successfully deleted ${selectedIds.size} companies`)
                setSelectedIds(new Set())
                onUpdate()
            } else {
                toast.error("Failed to delete companies")
            }
        } catch (error) {
            console.error("Bulk delete error:", error)
            toast.error("An error occurred")
        }
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden min-h-[300px]">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div
                                        className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => handleSort('company_name')}
                                    >
                                        Company Name
                                        {sortConfig.key === 'company_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Filter..."
                                            value={filters.company_name}
                                            onChange={(e) => handleFilterChange('company_name', e.target.value)}
                                            className="h-8 pl-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">Location</div>
                                    <Input
                                        placeholder="Filter..."
                                        value={filters.location}
                                        onChange={(e) => handleFilterChange('location', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">Contact Name</div>
                                    <Input
                                        placeholder="Filter..."
                                        value={filters.name}
                                        onChange={(e) => handleFilterChange('name', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">Surname</div>
                                    <Input
                                        placeholder="Filter..."
                                        value={filters.sur_name}
                                        onChange={(e) => handleFilterChange('sur_name', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">Phone</div>
                                    <Input
                                        placeholder="Filter..."
                                        value={filters.phone_number}
                                        onChange={(e) => handleFilterChange('phone_number', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="text-right w-[60px]">
                                <div className="flex items-center justify-end gap-2">
                                    {selectedIds.size > 0 && (
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleBulkMoveToKanban()
                                                    }}
                                                >
                                                    Add to Kanban
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleBulkDelete()
                                                    }}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>Delete Selected ({selectedIds.size})</span>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    )}
                                </div>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : filteredAndSorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">No ready companies found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSorted.map((company) => (
                                <TableRow
                                    key={company.id}
                                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedDetailCompany(company)}
                                >
                                    <TableCell className="font-medium">{company.company_name}</TableCell>
                                    <TableCell>{company.location || "-"}</TableCell>
                                    <TableCell>{company.name || '-'}</TableCell>
                                    <TableCell>{company.sur_name || '-'}</TableCell>
                                    <TableCell>{company.phone_number || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end">
                                            <Checkbox
                                                checked={selectedIds.has(company.id)}
                                                onCheckedChange={(checked) => {
                                                    const newSelected = new Set(selectedIds)
                                                    if (checked) {
                                                        newSelected.add(company.id)
                                                    } else {
                                                        newSelected.delete(company.id)
                                                    }
                                                    setSelectedIds(newSelected)
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <ReadyCompanyDialog
                company={selectedDetailCompany}
                isOpen={!!selectedDetailCompany}
                onClose={() => setSelectedDetailCompany(null)}
                onUpdate={onUpdate}
            />
        </div>
    )
}
