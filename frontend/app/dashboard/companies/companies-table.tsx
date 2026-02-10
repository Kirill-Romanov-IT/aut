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
import { Plus, MoreVertical, Trash2 } from "lucide-react"
import { Company, CompanySheet } from "./company-sheet"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"

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
}

export function CompaniesTable({
    companies,
    isLoading,
    onUpdate
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

    const handleSave = (updatedCompany: Company) => {
        // Since state is lifted, we notify the parent to update
        onUpdate()
    }

    const handleDelete = (id: string | number) => {
        // Notify parent to refresh
        onUpdate()
        setSelectedIds(prev => {
            const next = new Set(prev)
            next.delete(id)
            return next
        })
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
                body: JSON.stringify({ ids: Array.from(selectedIds) }),
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

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden min-h-[300px]">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold text-foreground">Name</TableHead>
                            <TableHead className="font-semibold text-foreground">Employees</TableHead>
                            <TableHead className="font-semibold text-foreground">Location</TableHead>
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
