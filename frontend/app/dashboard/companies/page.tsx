"use client"

import * as React from "react"
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
    const [isDialogOpen, setIsDialogOpen] = React.useState(false)
    const [isDragging, setIsDragging] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const processFile = (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            toast.error("Please upload a CSV file")
            return
        }
        console.log("Selected file:", file.name)
        toast.success(`File "${file.name}" ready for import`)
        setIsDialogOpen(false)
        // Backend logic will be added later
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
            <div className="px-4 lg:px-6 flex flex-col gap-4">
                <main className="w-full">
                    <CompaniesTable />
                </main>
            </div>
        </div>
    )
}
