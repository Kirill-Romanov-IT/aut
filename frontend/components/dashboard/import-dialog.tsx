"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { UploadIcon, FileIcon, XIcon } from "lucide-react"

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
    const [file, setFile] = useState<File | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        setError(null)

        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && droppedFile.type === "text/csv") {
            setFile(droppedFile)
        } else {
            setError("Please upload a valid CSV file")
        }
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        setError(null)
        const selectedFile = e.target.files?.[0]
        if (selectedFile && selectedFile.type === "text/csv") {
            setFile(selectedFile)
        } else {
            setError("Please upload a valid CSV file")
        }
    }

    const handleUpload = async () => {
        if (!file) return

        setIsUploading(true)
        setError(null)

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                throw new Error("Not authenticated")
            }

            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch("http://localhost:8000/upload-companies-csv", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.detail || "Upload failed")
            }

            // Success
            setFile(null)
            onOpenChange(false)
            // Reload the page to show new data
            window.location.reload()
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveFile = () => {
        setFile(null)
        setError(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handleClickUpload = () => {
        fileInputRef.current?.click()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Import companies</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import your companies.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={handleClickUpload}
                        className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${isDragging
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 bg-muted/50 hover:border-primary/50 hover:bg-muted/70"
                            }`}
                    >
                        {!file ? (
                            <>
                                <UploadIcon className="h-10 w-10 text-muted-foreground mb-4" />
                                <p className="text-sm text-muted-foreground text-center mb-1">
                                    Drag and drop your CSV file here
                                </p>
                                <p className="text-xs text-muted-foreground text-center">
                                    or click to browse
                                </p>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 w-full">
                                <FileIcon className="h-8 w-8 text-primary flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleRemoveFile()
                                    }}
                                    className="flex-shrink-0"
                                >
                                    <XIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileSelect}
                        className="hidden"
                    />
                    {error && (
                        <p className="text-sm text-destructive text-center">{error}</p>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button onClick={handleUpload} disabled={!file || isUploading}>
                        {isUploading ? "Uploading..." : "Upload CSV"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
