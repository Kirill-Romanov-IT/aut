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
import { useLanguage } from "@/components/language-provider"

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
    const { t } = useLanguage()
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
    }, [companies, selectedDetailCompany])

    const filteredAndSorted = React.useMemo(() => {
        let result = [...companies]

        Object.keys(filters).forEach((key) => {
            const filterValue = filters[key as keyof typeof filters]
            if (filterValue) {
                result = result.filter(c => {
                    const val = c[key as keyof ReadyCompany]
                    return val && val.toString().toLowerCase().includes(filterValue.toLowerCase())
                })
            }
        })

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

        const selectedCompanies = companies.filter(c =>
            Array.from(selectedIds).some(id => String(id) === String(c.id))
        )

        if (selectedCompanies.length === 0) {
            toast.error(t('error'))
            return
        }

        for (const company of selectedCompanies) {
            const missingFields: string[] = []
            if (!company.company_name?.trim()) missingFields.push(t('companyName'))
            if (!company.location?.trim()) missingFields.push(t('location'))
            if (!company.name?.trim()) missingFields.push(t('contactName'))
            if (!company.sur_name?.trim()) missingFields.push(t('surname'))
            if (!company.phone_number?.trim()) missingFields.push(t('phone'))

            if (missingFields.length > 0) {
                toast.error(`${t('error')}: ${missingFields.join(", ")}`, {
                    duration: 5000,
                })
                return
            }
        }

        const loadingToast = toast.loading(t('loading'))
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const idArray = Array.from(selectedIds).map(id => Number(id)).filter(id => !isNaN(id))

            const response = await fetch("http://localhost:8000/ready-companies/bulk-move-to-kanban", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(idArray),
            })

            const data = await response.json()

            if (response.ok) {
                const kanbanData = localStorage.getItem("lifecycle-kanban-state")
                const currentKanban = kanbanData ? JSON.parse(kanbanData) : []

                const newKanbanCompanies = data.map((comp: any) => ({
                    id: String(comp.id),
                    name: comp.name,
                    location: comp.location || "",
                    employees: comp.employees || 0,
                    status: comp.status || "new",
                    scheduledAt: comp.scheduled_at || new Date().toISOString(),
                    contactName: comp.contact_name || "",
                    contactSurname: comp.contact_surname || "",
                    contactPhone: comp.contact_phone || ""
                }))

                localStorage.setItem("lifecycle-kanban-state", JSON.stringify([...currentKanban, ...newKanbanCompanies]))

                toast.success(t('success'))
                setSelectedIds(new Set())
                onUpdate()
            } else {
                toast.error(data.detail || t('error'))
            }
        } catch (error) {
            console.error("Bulk move error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleBulkFindDecisionMaker = async () => {
        if (selectedIds.size === 0) return

        const loadingToast = toast.loading(t('loading'))
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            // 1. Filter companies: selected companies
            const companiesToProcess = companies.filter(c => selectedIds.has(c.id))

            if (companiesToProcess.length === 0) return

            // 2. Chunk into groups of 5
            const chunkSize = 5
            const chunks = []
            for (let i = 0; i < companiesToProcess.length; i += chunkSize) {
                chunks.push(companiesToProcess.slice(i, i + chunkSize))
            }

            let updatedCount = 0

            // 3. Process each chunk
            for (const chunk of chunks) {
                const payload = {
                    companies: chunk.map(c => ({
                        id: c.id,
                        company_name: c.company_name,
                        location: c.location
                    }))
                }

                const aiResponse = await fetch("http://localhost:8000/ready-companies/ai-bulk-find-decision-maker", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                })

                if (!aiResponse.ok) {
                    console.error("Bulk AI DM request failed")
                    continue
                }

                const aiResults = await aiResponse.json()

                // Prepare updates for Bulk Enrich Endpoint
                const updates = aiResults.map((result: any) => ({
                    id: result.id,
                    name: result.name,
                    sur_name: result.sur_name,
                    phone_number: result.phone_number
                })).filter((u: any) => u.name || u.sur_name || u.phone_number)

                if (updates.length > 0) {
                    const saveResponse = await fetch("http://localhost:8000/ready-companies/bulk-enrich", {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(updates),
                    })

                    if (saveResponse.ok) {
                        updatedCount += updates.length
                    }
                }
            }

            if (updatedCount > 0) {
                toast.success(t('success'), {
                    description: `${t('savedToDatabase')} (${updatedCount})`
                })
                onUpdate()
                setSelectedIds(new Set())
            } else {
                toast.error(t('error'), {
                    description: "No companies were updated. Check logs for details."
                })
            }

        } catch (error) {
            console.error("Bulk DM find error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleSelectAll = () => {
        const allIds = filteredAndSorted.map(c => c.id)
        setSelectedIds(new Set(allIds))
        toast.info(t('success'))
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

            const response = await fetch("http://localhost:8000/ready-companies/bulk-delete", {
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
            console.error("Bulk delete error:", error)
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
                                <div className="flex items-center gap-2">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted" onClick={(e) => e.stopPropagation()}>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSelectAll()
                                                }}
                                            >
                                                {t('selectAll')} ({filteredAndSorted.length})
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                className="cursor-pointer"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeselectAll()
                                                }}
                                                disabled={selectedIds.size === 0}
                                            >
                                                {t('deselectAll')}
                                            </DropdownMenuItem>

                                            {selectedIds.size > 0 && (
                                                <>
                                                    <div className="h-px bg-muted my-1" />
                                                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                        {t('bulkActions')} ({selectedIds.size})
                                                    </div>
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleBulkFindDecisionMaker()
                                                        }}
                                                    >
                                                        {t('findDecisionMaker')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleBulkMoveToKanban()
                                                        }}
                                                    >
                                                        {t('moveToKanban')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={async (e) => {
                                                            e.stopPropagation()
                                                            if (selectedIds.size === 0) return
                                                            const loadingToast = toast.loading(t('loading'))
                                                            try {
                                                                const token = localStorage.getItem("token")
                                                                for (const id of Array.from(selectedIds)) {
                                                                    await fetch(`http://localhost:8000/ready-companies/${id}/archive`, {
                                                                        method: "POST",
                                                                        headers: { Authorization: `Bearer ${token}` }
                                                                    })
                                                                }
                                                                toast.success(t('archivedSuccessfully'))
                                                                onUpdate()
                                                                setSelectedIds(new Set())
                                                            } catch (error) {
                                                                toast.error(t('error'))
                                                            } finally {
                                                                toast.dismiss(loadingToast)
                                                            }
                                                        }}
                                                    >
                                                        {t('archive')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive cursor-pointer"
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleBulkDelete()
                                                        }}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        <span>{t('deleteSelected')}</span>
                                                    </DropdownMenuItem>
                                                </>
                                            )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
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
                                        <div className="flex items-center">
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
