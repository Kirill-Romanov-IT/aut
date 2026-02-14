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
import { useLanguage } from "@/components/language-provider"

const buildHeadcountPrompt = (companyName: string, location: string) => {
    return `You are an OSINT analyst. Determine the approximate number of employees (headcount)
of a company using publicly available information.

Company name: "${companyName}"
Location: "${location}"

Rules:
- Return ONLY valid JSON.
- No explanations.
- No markdown.
- No extra text.
- If an exact number is unknown, return a range (min/max).
- Include a confidence score (0..1) and a short source hint.

JSON format:
{
  "headcount": { "value": number | null, "min": number | null, "max": number | null },
  "confidence": number,
  "source_hint": string
}`
}

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
    const { t, language } = useLanguage()
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)
    const [selectedIds, setSelectedIds] = React.useState<Set<number | string>>(new Set())

    const locale = language === 'ru' ? 'ru-RU' : 'en-US'

    const handleRowClick = (company: Company) => {
        setSelectedCompany(company)
        setIsSheetOpen(true)
    }

    const handleAddCompany = () => {
        const newCompany: Company = {
            id: "",
            name: t('new'),
            employees: 0,
            location: t('loading'),
            createdAt: new Date().toISOString().split('T')[0],
        }
        setSelectedCompany(newCompany)
        setIsSheetOpen(true)
    }

    const formatError = (detail: any): string => {
        if (typeof detail === 'string') return detail
        if (Array.isArray(detail)) {
            return detail.map(err => {
                const field = err.loc ? err.loc[err.loc.length - 1] : ''
                return `${field}: ${err.msg}`
            }).join(', ')
        }
        if (typeof detail === 'object' && detail !== null) {
            return JSON.stringify(detail)
        }
        return t('error')
    }

    const handleSave = async (updatedCompany: Company) => {
        const loadingToast = toast.loading(t('loading'))
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const isNew = !updatedCompany.id
            const url = isNew
                ? "http://localhost:8000/companies"
                : `http://localhost:8000/companies/${updatedCompany.id}`

            const response = await fetch(url, {
                method: isNew ? "POST" : "PUT",
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
                toast.success(t('success'))
                onUpdate()
            } else {
                const errorData = await response.json()
                const errorMessage = formatError(errorData.detail)
                toast.error(errorMessage)
            }
        } catch (error) {
            console.error("Save error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleDelete = async (id: string | number) => {
        const confirmDelete = window.confirm(t('confirmDelete'))
        if (!confirmDelete) return

        const loadingToast = toast.loading(t('loading'))
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
                toast.success(t('success'))
                setSelectedIds(prev => {
                    const next = new Set(prev)
                    next.delete(id)
                    return next
                })
                onUpdate()
            } else {
                toast.error(t('error'))
            }
        } catch (error) {
            console.error("Error deleting company:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
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

            const response = await fetch("http://localhost:8000/companies/bulk-delete", {
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
                onUpdate() // Refresh parent state
            } else {
                const data = await response.json()
                toast.error(data.detail || t('error'))
            }
        } catch (error) {
            console.error("Bulk delete error:", error)
            toast.error(t('error'))
        }
    }

    const handleBulkReady = async () => {
        if (selectedIds.size === 0) return

        const loadingToast = toast.loading(t('loading'))
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
                toast.success(t('success'))
                setSelectedIds(new Set())
                onUpdate() // Refresh parent state
            } else {
                const data = await response.json()
                toast.error(data.detail || t('error'))
            }
        } catch (error) {
            console.error("Bulk ready error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleSelectAll = () => {
        const allIds = companies.map(c => c.id)
        setSelectedIds(new Set(allIds))
        toast.info(t('success'))
    }

    const handleFillEmployeeCount = async (company: Company) => {
        const loadingToast = toast.loading(t('loading'))
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const prompt = buildHeadcountPrompt(company.name, company.location)

            // 1. Call Gemini Endpoint
            const aiResponse = await fetch("http://localhost:8000/companies/ai-estimate-headcount", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ prompt }),
            })

            if (!aiResponse.ok) {
                const err = await aiResponse.json()
                throw new Error(err.detail || "AI request failed")
            }

            const aiData = await aiResponse.json()
            console.log("Gemini Response:", aiData)

            let estimatedCount = 0
            if (aiData.headcount?.value) {
                estimatedCount = aiData.headcount.value
            } else if (aiData.headcount?.min && aiData.headcount?.max) {
                estimatedCount = Math.floor((aiData.headcount.min + aiData.headcount.max) / 2)
            } else if (aiData.headcount?.min) {
                estimatedCount = aiData.headcount.min
            } else if (aiData.headcount?.max) {
                estimatedCount = aiData.headcount.max
            }

            if (!estimatedCount) {
                toast.warning("Could not determine headcount")
                return
            }

            // 2. Update Company via PUT
            const updateResponse = await fetch(`http://localhost:8000/companies/${company.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    ...company,
                    employees: estimatedCount,
                    // Keep other fields as is, or updated if they changed in the backend logic, 
                    // but here we are sending what we have + new employee count.
                    // Note: The PUT endpoint expects name, employees, location.
                    name: company.name,
                    location: company.location
                }),
            })

            if (updateResponse.ok) {
                toast.success(t('success'))
                onUpdate()
            } else {
                const errorData = await updateResponse.json()
                toast.error(errorData.detail || t('error'))
            }

        } catch (error) {
            console.error("Fill employee count error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleBulkFillEmployeeCount = async () => {
        if (selectedIds.size === 0) return

        const loadingToast = toast.loading(t('loading') || "Processing...")
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            // 1. Filter companies: selected AND (employees is 0 or null/undefined)
            const companiesToProcess = companies.filter(c =>
                selectedIds.has(c.id) && (!c.employees || c.employees === 0)
            )

            if (companiesToProcess.length === 0) {
                toast.info("No companies need updating (all selected have employees count).")
                return
            }

            // 2. Chunk into groups of 10
            const chunkSize = 10
            const chunks = []
            for (let i = 0; i < companiesToProcess.length; i += chunkSize) {
                chunks.push(companiesToProcess.slice(i, i + chunkSize))
            }

            let updatedCount = 0

            // 3. Process each chunk
            for (const chunk of chunks) {
                // Prepare payload for AI Bulk Endpoint
                const payload = {
                    companies: chunk.map(c => ({
                        id: c.id,
                        name: c.name,
                        location: c.location
                    }))
                }

                const aiResponse = await fetch("http://localhost:8000/companies/ai-bulk-estimate-headcount", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                })

                if (!aiResponse.ok) {
                    console.error("Bulk AI request failed")
                    continue // Try next chunk
                }

                const aiResults = await aiResponse.json()

                // Prepare updates for Bulk Enrich Endpoint
                const updates = []
                for (const result of aiResults) {
                    let estimatedCount = 0
                    if (result.headcount?.value) {
                        estimatedCount = result.headcount.value
                    } else if (result.headcount?.min && result.headcount?.max) {
                        estimatedCount = Math.floor((result.headcount.min + result.headcount.max) / 2)
                    } else if (result.headcount?.min) {
                        estimatedCount = result.headcount.min
                    } else if (result.headcount?.max) {
                        estimatedCount = result.headcount.max
                    }

                    if (estimatedCount > 0) {
                        updates.push({
                            id: result.id, // ID from AI result (string/number)
                            employees: estimatedCount
                        })
                    }
                }

                if (updates.length > 0) {
                    const saveResponse = await fetch("http://localhost:8000/companies/bulk-enrich", {
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

            toast.success(`Updated ${updatedCount} companies.`)
            onUpdate()
            setSelectedIds(new Set())

        } catch (error) {
            console.error("Bulk fill error:", error)
            toast.error(t('error'))
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleDeselectAll = () => {
        setSelectedIds(new Set())
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
                                        {t('companyName')}
                                        {sortConfig.key === 'name' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <div className="relative">
                                        <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder={t('filterPlaceholder')}
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
                                        {t('employees')}
                                        {sortConfig.key === 'employees' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                                        ) : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                                    </div>
                                    <Input
                                        placeholder={t('employeesFilterPlaceholder')}
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
                                        {t('location')}
                                    </div>
                                    <Input
                                        placeholder={t('filterPlaceholder')}
                                        value={filters.location}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onFilterChange('location', e.target.value)}
                                        className="h-8 text-xs bg-muted/50 border-none focus-visible:ring-1"
                                        onClick={(e: React.MouseEvent) => e.stopPropagation()}
                                    />
                                </div>
                            </TableHead>
                            <TableHead className="font-semibold text-foreground">{t('createdAt')}</TableHead>

                            <TableHead className="text-right w-[60px]">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                            {t('selectAll')} ({companies.length})
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
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleBulkFillEmployeeCount()
                                                    }}
                                                >
                                                    {t('fillEmployeeCount')}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        handleBulkReady()
                                                    }}
                                                >
                                                    {t('moveToReady')}
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
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {t('loading')}
                                </TableCell>
                            </TableRow>
                        ) : companies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    {t('noData')}
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
                                        {company.created_at ? new Date(company.created_at).toLocaleDateString(locale) : (language === 'ru' ? 'Н/Д' : 'N/A')}
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
