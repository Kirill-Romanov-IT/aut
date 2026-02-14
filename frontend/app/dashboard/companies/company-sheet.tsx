"use client"

import * as React from "react"
import { formatCompanyName } from "@/lib/utils"
import { useLanguage } from "@/components/language-provider"
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
    id: number | string
    name: string
    employees: number
    location: string
    limit_val?: string | null
    created_at?: string
    is_ready?: boolean
    createdAt?: string // Keep optional for backward compatibility if needed, but backend sends created_at
}

interface CompanySheetProps {
    company: Company | null
    isOpen: boolean
    onClose: () => void
    onSave: (company: Company) => void
    onDelete: (id: string | number) => void
}

export function CompanySheet({
    company,
    isOpen,
    onClose,
    onSave,
    onDelete,
}: CompanySheetProps) {
    const [formData, setFormData] = React.useState<Company | null>(null)
    const { t } = useLanguage()

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
                    <SheetTitle>{company?.id ? `${t('editing')} ${formatCompanyName(company.name)}` : t('addCompany')}</SheetTitle>
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
                        <Label htmlFor="employees">Employees</Label>
                        <Input
                            id="employees"
                            type="number"
                            value={formData.employees}
                            onChange={(e) => setFormData({ ...formData, employees: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                            id="location"
                            value={formData.location}
                            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        />
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
