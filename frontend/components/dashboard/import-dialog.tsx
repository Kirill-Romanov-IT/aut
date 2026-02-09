"use client"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

interface ImportDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
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
                    <div className="flex items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 bg-muted/50">
                        <p className="text-sm text-muted-foreground text-center">
                            CSV import coming soon
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                    <Button disabled>Upload CSV</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
