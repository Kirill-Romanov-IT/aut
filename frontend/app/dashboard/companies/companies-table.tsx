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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, MoreVertical, Trash2, ArrowUpDown, ChevronUp, ChevronDown, Search } from "lucide-react"
import { Company, CompanySheet } from "./company-sheet"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"

const initialCompanies: Company[] = [
    {
        id: "1",
        name: "Acme Corp",
        employees: 120,
        location: "New York",
        created_at: "2023-10-01",
    },
    {
        id: "2",
        name: "Globex Corporation",
        employees: 500,
        location: "San Francisco",
        created_at: "2023-08-15",
    },
    {
        id: "3",
        name: "Soylent Corp",
        employees: 50,
        location: "Chicago",
        created_at: "2023-09-20",
    },
]

export interface CompaniesTableProps {
    companies: Company[]
    isLoading: boolean
    onUpdate: () => void
    onEnrich: () => void
    sortConfig: { key: string, direction: 'asc' | 'desc' | null }
    onSort: (key: string) => void
    filters: { name: string, employees: string, location: string }
    onFilterChange: (key: string, value: string) => void
}

export function CompaniesTable({
    companies,
    isLoading,
    onUpdate,
    onEnrich,
    sortConfig,
    onSort,
    filters,
    onFilterChange
}: CompaniesTableProps) {
    const router = useRouter()
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)
    const [selectedIds, setSelectedIds] = React.useState<Set<number | string>>(new Set())

    const handleRowClick = (company: Company) => {
        setSelectedCompany(company)
        setIsSheetOpen(true)
    }

    const handleAddCompany = () => {
        const newCompany: Company = {
            id: "",
            name: "New Company",
            employees: 0,
            location: "Unknown",
            createdAt: new Date().toISOString().split('T')[0],
        }
        setSelectedCompany(newCompany)
        setIsSheetOpen(true)
    }

    const handleSave = async (updatedCompany: Company) => {
        const loadingToast = toast.loading("Updating company...")
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            // Ensure ID is sent correctly (backend expects int)
            const companyId = typeof updatedCompany.id === 'string' ? parseInt(updatedCompany.id) : updatedCompany.id

            const response = await fetch(`http://localhost:8000/companies/${companyId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: updatedCompany.name,
                    employees: updatedCompany.employees,
                    location: updatedCompany.location
                }),
            })

            if (response.ok) {
                toast.success("Company updated successfully")
                onUpdate()
            } else {
                const errorData = await response.json()
                toast.error(errorData.detail || "Failed to update company")
            }
        } catch (error) {
            console.error("Update error:", error)
            toast.error("An error occurred during update")
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleDelete = async (id: string | number) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this company?")
        if (!confirmDelete) return

        const loadingToast = toast.loading("Deleting company...")
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/companies/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify([id]),
            })

            if (response.ok) {
                toast.success("Company deleted")
                setSelectedIds(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
                onUpdate()
            } else {
                toast.error("Failed to delete company")
            }
        } catch (error) {
            console.error("Error deleting company:", error)
            toast.error("An error occurred")
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const confirmDelete = window.confirm(`Are you sure you want to delete ${selectedIds.size} companies?`)
        if (!confirmDelete) return

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/companies/bulk-delete", {
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
                onUpdate() // Refresh parent state
            } else {
                const data = await response.json()
                toast.error(data.detail || "Failed to delete companies")
            }
        } catch (error) {
            console.error("Bulk delete error:", error)
            toast.error("An error occurred while deleting companies")
        }
    }

    const handleBulkReady = async () => {
        if (selectedIds.size === 0) return

        const loadingToast = toast.loading("Moving to Ready...")
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/companies/bulk-ready", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(Array.from(selectedIds)),
            })

            if (response.ok) {
                toast.success(`Successfully moved ${selectedIds.size} companies to Ready`)
                setSelectedIds(new Set())
                onUpdate() // Refresh parent state
            } else {
                const data = await response.json()
                toast.error(data.detail || "Failed to move companies")
            }
        } catch (error) {
            console.error("Bulk ready error:", error)
            toast.error("An error occurred")
        } finally {
            toast.dismiss(loadingToast)
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
                                        onClick={() => onSort('name')}
                                    >
                                        Name
                                        {sortConfig.key === 'name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Filter..."
                                            value={filters.name}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('name', e.target.value)}
                                            className="h-8 pl-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                            onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div
                                        className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors"
                                        onClick={() => onSort('employees')}
                                    >
                                        Employees
                                        {sortConfig.key === 'employees' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <Input
                                        placeholder="e.g. >200"
                                        value={filters.employees}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('employees', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                        Location
                                    </div>
                                    <Input
                                        placeholder="Filter..."
                                        value={filters.location}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('location', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">Created At</TableHead>
                            <TableHead className="text-right w-[60px]">
                                {selectedIds.size > 0 && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    onEnrich()
                                                }}
                                            >
                                                Enrich Data
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleBulkReady()
                                                }}
                                            >
                                                Move to Ready
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
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : companies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No companies found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            companies.map((company) => (
                                <TableRow
                                    key={company.id}
                                    className="group cursor-pointer transition-colors hover:bg-muted/50"
                                    onClick={() => handleRowClick(company)}
                                >
                                    <TableCell className="font-medium">{company.name}</TableCell>
                                    <TableCell>{company.employees}</TableCell>
                                    <TableCell>{company.location}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                    <TableCell className="text-right">
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
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-start">
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-10 h-10 shadow-sm hover:shadow-md transition-all border-dashed"
                    onClick={handleAddCompany}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <CompanySheet
                company={selectedCompany}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    )
}
