"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CompaniesTable } from "./companies-table"
import { Button } from "@/components/ui/button"
import { Upload, FileUp } from "lucide-react"
import { toast } from "sonner"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"

import { ReadyCompaniesTable, ReadyCompany } from "./ready-companies-table"

export default function CompaniesPage() {
    const router = useRouter()
    const { t } = useLanguage()
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isDragging, setIsDragging] = React.useState(false)
    // ... rest of state
    const [companies, setCompanies] = React.useState<any[]>([])
    const [readyCompanies, setReadyCompanies] = React.useState<ReadyCompany[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
    const [isReadyLoading, setIsReadyLoading] = React.useState(true)
    const [importResult, setImportResult] = React.useState<{ inserted: number, total: number } | null>(null)
    const [isSuccessDialogOpen, setIsSuccessDialogOpen] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const fetchCompanies = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/companies", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.status === 401) {
                localStorage.removeItem("token")
                router.push("/")
                return
            }

            if (response.ok) {
                const data = await response.json()
                setCompanies(data)
            }
        } catch (error) {
            console.error("Error fetching companies:", error)
        } finally {
            setIsLoading(false)
        }
    }, [router])

    const fetchReadyCompanies = React.useCallback(async () => {
        setIsReadyLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) return

            const response = await fetch("http://localhost:8000/ready-companies", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setReadyCompanies(data)
            }
        } catch (error) {
            console.error("Error fetching ready companies:", error)
        } finally {
            setIsReadyLoading(false)
        }
    }, [])

    const refreshAll = React.useCallback(() => {
        fetchCompanies()
        fetchReadyCompanies()
    }, [fetchCompanies, fetchReadyCompanies])

    React.useEffect(() => {
        refreshAll()

        const handleUpdate = () => {
            refreshAll()
        }

        window.addEventListener("companies-updated", handleUpdate)
        return () => {
            window.removeEventListener("companies-updated", handleUpdate)
        }
    }, [refreshAll])

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const processFile = async (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            toast.error(t('pleaseUploadCsv'))
            return
        }

        const formData = new FormData()
        formData.append("file", file)

        const loadingToast = toast.loading(t('uploadingCompanies'))

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                toast.error(t('loginFirst'))
                return
            }

            const response = await fetch("http://localhost:8000/companies/upload", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            })

            if (response.status === 401) {
                localStorage.removeItem("token")
                router.push("/")
                toast.error(t('sessionExpired'))
                return
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || t('error'))
            }

            const data = await response.json()

            setImportResult({
                inserted: data.inserted_count,
                total: data.total_in_csv
            })
            setIsSuccessDialogOpen(true)

            setTimeout(() => {
                setIsSuccessDialogOpen(false)
            }, 5000)

            setIsDialogOpen(false)
            fetchCompanies()

        } catch (error) {
            console.error("Upload error:", error)
            toast.error(t('importFailed'), {
                description: error instanceof Error ? error.message : t('error'),
                duration: 5000,
            })
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)

        const file = e.dataTransfer.files?.[0]
        if (file) {
            processFile(file)
        }
    }

    const [sortConfig, setSortConfig] = React.useState<{ key: string, direction: 'asc' | 'desc' | null }>({ key: '', direction: null })
    const [filters, setFilters] = React.useState({ name: '', employees: '', location: '' })

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

    const filteredAndSortedCompanies = React.useMemo(() => {
        let result = [...companies]

        if (filters.name) {
            result = result.filter(c => c.name.toLowerCase().includes(filters.name.toLowerCase()))
        }
        if (filters.location) {
            result = result.filter(c => c.location && c.location.toLowerCase().includes(filters.location.toLowerCase()))
        }
        if (filters.employees) {
            const val = filters.employees.trim()
            if (val.startsWith('>')) {
                const num = parseInt(val.slice(1))
                if (!isNaN(num)) result = result.filter(c => c.employees > num)
            } else if (val.startsWith('<')) {
                const num = parseInt(val.slice(1))
                if (!isNaN(num)) result = result.filter(c => c.employees < num)
            } else {
                const num = parseInt(val)
                if (!isNaN(num)) result = result.filter(c => c.employees === num)
            }
        }

        if (sortConfig.key && sortConfig.direction) {
            result.sort((a, b) => {
                const aValue = a[sortConfig.key]
                const bValue = b[sortConfig.key]

                if (aValue === bValue) return 0
                const comparison = aValue > bValue ? 1 : -1
                return sortConfig.direction === 'asc' ? comparison : -comparison
            })
        }

        return result
    }, [companies, sortConfig, filters])

    const handleEnrich = async () => {
        const loadingToast = toast.loading(t('enrichingData'))

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                toast.error(t('loginFirst'))
                return
            }

            const updates = companies.map(company => ({
                id: company.id,
                employees: Math.floor(Math.random() * (500 - 25 + 1)) + 25
            }))

            const response = await fetch("http://localhost:8000/companies/bulk-enrich", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            })

            if (response.status === 401) {
                localStorage.removeItem("token")
                router.push("/")
                toast.error(t('sessionExpired'))
                return
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || t('enrichmentFailed'))
            }

            toast.success(t('dataEnriched'), {
                description: `${t('savedToDatabase')} (${companies.length})`
            })

            fetchCompanies()

        } catch (error) {
            console.error("Enrichment error:", error)
            toast.error(t('enrichmentFailed'), {
                description: error instanceof Error ? error.message : t('error'),
            })
        } finally {
            toast.dismiss(loadingToast)
        }
    }

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('companies')}</h2>
                    <p className="text-sm text-muted-foreground">{t('companiesDescription')}</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-muted-foreground mr-2">
                        {t('total')}: {filteredAndSortedCompanies.length} {t('active')} / {readyCompanies.length} {t('ready')}
                    </span>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2 bg-[#020817] text-white hover:bg-[#020817]/90 dark:bg-primary dark:text-primary-foreground"
                            >
                                <Upload className="h-4 w-4 text-white" />
                                <span className="text-white">{t('importCsv')}</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>{t('importCompanies')}</DialogTitle>
                                <DialogDescription>
                                    {t('orDragAndDrop')}
                                </DialogDescription>
                            </DialogHeader>
                            <div
                                className={cn(
                                    "mt-4 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
                                    isDragging
                                        ? "border-primary bg-primary/5"
                                        : "border-muted-foreground/25 hover:border-primary hover:bg-muted/50"
                                )}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={handleImportClick}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".csv"
                                    className="hidden"
                                />
                                <div className="flex flex-col items-center gap-2 text-center text-sm text-muted-foreground">
                                    <div className="rounded-full bg-muted p-3">
                                        <FileUp className="h-6 w-6 text-muted-foreground" />
                                    </div>
                                    <p>
                                        <span className="font-semibold text-foreground">{t('clickToUpload')}</span> {t('orDragAndDrop')}
                                    </p>
                                    <p className="text-xs">{t('csvLimit')}</p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="px-4 lg:px-6">
                <Tabs defaultValue="all" className="w-full">
                    <TabsList className="mb-4">
                        <TabsTrigger value="all">{t('allCompanies')}</TabsTrigger>
                        <TabsTrigger value="ready">{t('readyCompanies')}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all">
                        <CompaniesTable
                            companies={filteredAndSortedCompanies}
                            isLoading={isLoading}
                            onUpdate={refreshAll}
                            onEnrich={handleEnrich}
                            sortConfig={sortConfig}
                            onSort={handleSort}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                        />
                    </TabsContent>
                    <TabsContent value="ready">
                        <ReadyCompaniesTable
                            companies={readyCompanies}
                            isLoading={isReadyLoading}
                            onUpdate={refreshAll}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">{t('importStatus')}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                            <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-center text-lg font-medium text-foreground">
                            {t('imported')} {importResult?.inserted} {t('outOf')} {importResult?.total}
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                            {t('duplicatesSkipped')}
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Button
                            className="px-8"
                            onClick={() => setIsSuccessDialogOpen(false)}
                        >
                            {t('confirm')}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
