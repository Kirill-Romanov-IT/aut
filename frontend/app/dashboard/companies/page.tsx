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

export default function CompaniesPage() {
    const router = useRouter()
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isDragging, setIsDragging] = React.useState(false)
    const [companies, setCompanies] = React.useState<any[]>([])
    const [isLoading, setIsLoading] = React.useState(true)
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
            } else {
                console.error("Failed to fetch companies")
            }
        } catch (error) {
            console.error("Error fetching companies:", error)
        } finally {
            setIsLoading(false)
        }
    }, [router])

    React.useEffect(() => {
        fetchCompanies()

        const handleUpdate = () => {
            fetchCompanies()
        }

        window.addEventListener("companies-updated", handleUpdate)
        return () => {
            window.removeEventListener("companies-updated", handleUpdate)
        }
    }, [fetchCompanies])

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const processFile = async (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            toast.error("Please upload a CSV file")
            return
        }

        const formData = new FormData()
        formData.append("file", file)

        const loadingToast = toast.loading("Uploading companies...")

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                toast.error("Please login first")
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
                toast.error("Session expired, please login again")
                return
            }

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || "Upload failed")
            }

            const data = await response.json()

            setImportResult({
                inserted: data.inserted_count,
                total: data.total_in_csv
            })
            setIsSuccessDialogOpen(true)

            // Auto-hide after 5 seconds
            setTimeout(() => {
                setIsSuccessDialogOpen(false)
            }, 5000)

            setIsDialogOpen(false)

            // Refresh companies list
            fetchCompanies()

        } catch (error) {
            console.error("Upload error:", error)
            toast.error("Import Failed", {
                description: error instanceof Error ? error.message : "Failed to upload file",
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

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
                    <p className="text-sm text-muted-foreground">Manage and track all your active and archived companies in one central place.</p>
                </div>
                <div className="flex items-center gap-4">
                    {companies.length > 0 && (
                        <span className="text-sm font-medium text-muted-foreground">
                            Total: {companies.length}
                        </span>
                    )}
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button
                                className="gap-2 bg-[#020817] text-white hover:bg-[#020817]/90 dark:bg-primary dark:text-primary-foreground"
                            >
                                <Upload className="h-4 w-4 text-white" />
                                <span className="text-white">Import CSV</span>
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Import Companies</DialogTitle>
                                <DialogDescription>
                                    Drag and drop your CSV file here or click to browse.
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
                                        <span className="font-semibold text-foreground">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs">CSV file (max. 10MB)</p>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="px-4 lg:px-6 flex flex-col gap-4">
                <main className="w-full">
                    <CompaniesTable
                        companies={companies}
                        isLoading={isLoading}
                        onUpdate={fetchCompanies}
                    />
                </main>
            </div>

            <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Import Status</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center justify-center space-y-4 py-6">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                            <Upload className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-center text-lg font-medium text-foreground">
                            Imported {importResult?.inserted} out of {importResult?.total}
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                            Duplicates were automatically skipped.
                        </p>
                    </div>
                    <div className="flex justify-center">
                        <Button
                            className="px-8"
                            onClick={() => setIsSuccessDialogOpen(false)}
                        >
                            OK
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
