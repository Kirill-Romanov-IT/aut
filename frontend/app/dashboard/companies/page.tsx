"use client"

import * as React from "react"
import { CompaniesTable } from "./companies-table"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "sonner"

export default function CompaniesPage() {
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const handleImportClick = () => {
        fileInputRef.current?.click()
    }

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (file) {
            console.log("Selected file:", file.name)
            toast.success(`File "${file.name}" selected for import`)
            // Backend logic will be added later as per requirements
        }
    }

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
                    <p className="text-sm text-muted-foreground">Manage and track all your active and archived companies in one central place.</p>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".csv"
                        className="hidden"
                    />
                    <Button
                        onClick={handleImportClick}
                        className="gap-2 bg-[#020817] text-white hover:bg-[#020817]/90 dark:bg-primary dark:text-primary-foreground"
                    >
                        <Upload className="h-4 w-4 text-white" />
                        <span className="text-white">Import CSV</span>
                    </Button>
                </div>
            </div>
            <div className="px-4 lg:px-6 flex flex-col gap-4">
                <main className="w-full">
                    <CompaniesTable />
                </main>
            </div>
        </div>
    )
}
