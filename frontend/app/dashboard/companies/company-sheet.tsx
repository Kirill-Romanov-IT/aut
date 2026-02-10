"use client"

import * as React from "react"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

export type Company = {
    id: string
    name: string
    status: "Active" | "Archived"
    createdAt: string
}

interface CompanySheetProps {
    company: Company | null
    isOpen: boolean
    onClose: () => void
    onSave: (company: Company) => void
    onDelete: (id: string) => void
}

export function CompanySheet({
    company,
    isOpen,
    onClose,
    onSave,
    onDelete,
}: CompanySheetProps) {
    const [formData, setFormData] = React.useState<Company | null>(null)

    React.useEffect(() => {
        setFormData(company)
    }, [company])

    if (!formData) return null

    const handleSave = () => {
        onSave(formData)
        onClose()
    }

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="right" className="sm:max-w-[400px]">
                <SheetHeader>
                    <SheetTitle>{company?.id ? "Edit Company" : "Add Company"}</SheetTitle>
                    <SheetDescription>
                        Modify company details here. Click save when you're done.
                    </SheetDescription>
                </SheetHeader>
                <div className="grid gap-6 py-6">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                            value={formData.status}
                            onValueChange={(value: "Active" | "Archived") =>
                                setFormData({ ...formData, status: value })
                            }
                        >
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Active">Active</SelectItem>
                                <SelectItem value="Archived">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="flex flex-col gap-3 mt-4">
                    <Button onClick={handleSave} className="w-full">Save Changes</Button>
                    {company?.id && (
                        <Button
                            variant="destructive"
                            onClick={() => {
                                onDelete(formData.id)
                                onClose()
                            }}
                            className="w-full"
                        >
                            Delete Company
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    )
}
