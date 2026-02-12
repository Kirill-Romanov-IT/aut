"use client"

import * as React from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, ArrowUpDown, ChevronUp, ChevronDown, Search, MoreVertical } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/components/language-provider"
import { useRouter } from "next/navigation"

import { ArchivedCompanyDialog, ArchivedCompany } from "./archived-company-dialog"

export interface ArchivedCompaniesTableProps {
    companies: ArchivedCompany[]
    isLoading: boolean
    onUpdate: () => void
}

export function ArchivedCompaniesTable({
    companies,
    isLoading,
    onUpdate
}: ArchivedCompaniesTableProps) {
    const router = useRouter()
    const { t } = useLanguage()
    const [selectedIds, setSelectedIds] = React.useState<Set<number | string>>(new Set())
    const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null })
    const [filters, setFilters] = React.useState({ company_name: '', location: '', name: '', sur_name: '', phone_number: '' })
    const [selectedDetailCompany, setSelectedDetailCompany] = React.useState<ArchivedCompany | null>(null)

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

    const filteredAndSorted = React.useMemo(() => {
        let result = [...companies]

        Object.keys(filters).forEach((key) => {
            const filterValue = filters[key as keyof typeof filters]
            if (filterValue) {
                result = result.filter(c => {
                    const val = c[key as keyof ArchivedCompany]
                    return val && val.toString().toLowerCase().includes(filterValue.toLowerCase())
                })
            }
        })

        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key as keyof ArchivedCompany] || ''
                const bValue = b[sortConfig.key as keyof ArchivedCompany] || ''

                if (aValue === bValue) return 0
                const comparison = aValue > bValue ? 1 : -1
                return sortConfig.direction === 'asc' ? comparison : -comparison
            })
        }

        return result
    }, [companies, sortConfig, filters])

    const handleSelectAll = () => {
        const allIds = filteredAndSorted.map(c => c.id)
        setSelectedIds(new Set(allIds))
    }

    const handleDeselectAll = () => {
        setSelectedIds(new Set())
    }

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return

        const confirmDelete = window.confirm(t('confirmDelete'))
        if (!confirmDelete) return

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            // For now, archived companies don't have a bulk-delete endpoint yet, 
            // but we can implement it or just use a loop if it's small.
            // Let's assume there's a bulk delete for archived as well or we add it to main.py later.
            // Actually, I'll just use the same pattern as ReadyCompaniesTable but with /archived-companies/bulk-delete
            const response = await fetch("http://localhost:8000/archived-companies/bulk-delete", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(Array.from(selectedIds)),
            })

            if (response.ok) {
                toast.success(t('success'))
                setSelectedIds(new Set())
                onUpdate()
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Archive delete error:", error)
            toast.error(t('error'))
        }
    }

    const handleBulkRestore = async () => {
        if (selectedIds.size === 0) return

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/archived-companies/bulk-restore", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(Array.from(selectedIds)),
            })

            if (response.ok) {
                toast.success(t('success'))
                setSelectedIds(new Set())
                onUpdate()
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Archive restore error:", error)
            toast.error(t('error'))
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
                                        {t('companyName')}
                                        {sortConfig.key === 'company_name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder={t('filterPlaceholder')}
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
                                    <div className="flex items-center gap-2">{t('location')}</div>
                                    <Input
                                        placeholder={t('filterPlaceholder')}
                                        value={filters.location}
                                        onChange={(e) => handleFilterChange('location', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">{t('contactName')}</div>
                                    <Input
                                        placeholder={t('filterPlaceholder')}
                                        value={filters.name}
                                        onChange={(e) => handleFilterChange('name', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">{t('surname')}</div>
                                    <Input
                                        placeholder={t('filterPlaceholder')}
                                        value={filters.sur_name}
                                        onChange={(e) => handleFilterChange('sur_name', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground py-4">
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">{t('phone')}</div>
                                    <Input
                                        placeholder={t('filterPlaceholder')}
                                        value={filters.phone_number}
                                        onChange={(e) => handleFilterChange('phone_number', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="text-right w-[60px]">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem onClick={handleSelectAll}>
                                            {t('selectAll')} ({filteredAndSorted.length})
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleDeselectAll} disabled={selectedIds.size === 0}>
                                            {t('deselectAll')}
                                        </DropdownMenuItem>
                                        {selectedIds.size > 0 && (
                                            <>
                                                <div className="h-px bg-muted my-1" />
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={handleBulkRestore}
                                                >
                                                    <span>{t('moveToKanban')}</span>
                                                </DropdownMenuItem>
                                                <div className="h-px bg-muted my-1" />
                                                <DropdownMenuItem
                                                    className="text-destructive focus:text-destructive cursor-pointer"
                                                    onClick={handleBulkDelete}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    <span>{t('deleteSelected')}</span>
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">{t('loading')}</TableCell>
                            </TableRow>
                        ) : filteredAndSorted.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">{t('noData')}</TableCell>
                            </TableRow>
                        ) : (
                            filteredAndSorted.map((company) => (
                                <TableRow
                                    key={company.id}
                                    className="group cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedDetailCompany(company)}
                                >
                                    <TableCell className="font-medium">{company.company_name}</TableCell>
                                    <TableCell>{company.location || t('notAvailable')}</TableCell>
                                    <TableCell>{company.name || t('notAvailable')}</TableCell>
                                    <TableCell>{company.sur_name || t('notAvailable')}</TableCell>
                                    <TableCell>{company.phone_number || t('notAvailable')}</TableCell>
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

            <ArchivedCompanyDialog
                company={selectedDetailCompany}
                isOpen={!!selectedDetailCompany}
                onClose={() => setSelectedDetailCompany(null)}
            />
        </div>
    )
}
