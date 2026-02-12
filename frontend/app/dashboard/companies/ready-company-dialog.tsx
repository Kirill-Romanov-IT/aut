"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MapPinIcon, UserIcon, PhoneIcon, PencilIcon, CheckIcon, XIcon, Building2Icon } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export type ReadyCompany = {
    id: number | string
    company_name: string
    location: string
    name: string
    sur_name: string
    phone_number: string
    created_at?: string
}

interface ReadyCompanyDialogProps {
    company: ReadyCompany | null
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void
}

export function ReadyCompanyDialog({
    company,
    isOpen,
    onClose,
    onUpdate,
}: ReadyCompanyDialogProps) {
    const router = useRouter()
    const [editingField, setEditingField] = React.useState<string | null>(null)
    const [localCompany, setLocalCompany] = React.useState<ReadyCompany | null>(company)
    const [tempValues, setTempValues] = React.useState<Partial<ReadyCompany>>({})
    const [isSaving, setIsSaving] = React.useState(false)

    React.useEffect(() => {
        if (company) {
            setLocalCompany(company)
            setTempValues(company)
        }
    }, [company])

    if (!localCompany) return null

    const handleStartEdit = (field: string, value: string) => {
        setEditingField(field)
        setTempValues(prev => ({ ...prev, [field]: value }))
    }

    const handleCancelEdit = () => {
        setEditingField(null)
        setTempValues(localCompany || {})
    }

    const handleSave = async () => {
        if (!localCompany.id || isSaving) return
        setIsSaving(true)

        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch(`http://localhost:8000/ready-companies/${localCompany.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(tempValues),
            })

            if (response.ok) {
                const updated = await response.json()
                toast.success("Company updated successfully")
                setEditingField(null)
                setLocalCompany(updated)
                onUpdate()
            } else {
                const errorData = await response.json()
                toast.error(errorData.detail || "Failed to update company")
            }
        } catch (error) {
            console.error("Update error:", error)
            toast.error("An error occurred during update")
        } finally {
            setIsSaving(false)
        }
    }

    const renderEditableField = (
        label: string,
        field: keyof ReadyCompany,
        icon: React.ReactNode,
        placeholder: string = "Enter value..."
    ) => {
        const isEditing = editingField === field
        const value = isEditing ? (tempValues[field] as string || "") : (localCompany[field] as string || "-")

        return (
            <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    {label}
                </label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/20 focus-within:border-primary/30 transition-colors">
                    <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                        {icon}
                    </div>
                    {isEditing ? (
                        <div className="flex items-center gap-2 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                            <Input
                                value={tempValues[field] as string || ""}
                                onChange={(e) => setTempValues(prev => ({ ...prev, [field]: e.target.value }))}
                                placeholder={placeholder}
                                className="h-8 py-0 bg-transparent border-none focus-visible:ring-0 text-sm font-medium"
                                autoFocus
                            />
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    className="p-1 hover:bg-green-100 text-green-600 rounded-md transition-colors disabled:opacity-50"
                                    title="Save"
                                >
                                    <CheckIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    disabled={isSaving}
                                    className="p-1 hover:bg-red-100 text-red-600 rounded-md transition-colors disabled:opacity-50"
                                    title="Cancel"
                                >
                                    <XIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between flex-1 group/field">
                            <span className="text-sm font-medium text-foreground/80">
                                {value}
                            </span>
                            <button
                                onClick={() => handleStartEdit(field as string, localCompany[field] as string || "")}
                                className="p-1.5 opacity-0 group-hover/field:opacity-100 hover:bg-primary/10 text-primary/60 hover:text-primary rounded-md transition-all active:scale-90"
                                title={`Edit ${label}`}
                            >
                                <PencilIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 overflow-hidden bg-background/95 backdrop-blur-sm">
                <div className="bg-primary/5 p-8 flex flex-col items-center text-center gap-6">
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-2xl font-bold text-primary">
                            {localCompany.company_name.charAt(0)}
                        </span>
                    </div>
                    <div className="space-y-2">
                        <DialogTitle className="text-xl font-bold tracking-tight">
                            {localCompany.company_name}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Detailed information about {localCompany.company_name}
                        </DialogDescription>
                        <div className="flex items-center justify-center gap-2">
                            <Badge variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">
                                Ready Company
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid gap-4">
                        {renderEditableField("Company Name", "company_name", <Building2Icon className="h-4 w-4" />, "Company name")}
                        {renderEditableField("Location", "location", <MapPinIcon className="h-4 w-4" />, "City, Country")}
                        {renderEditableField("Contact Name", "name", <UserIcon className="h-4 w-4" />, "First name")}
                        {renderEditableField("Surname", "sur_name", <UserIcon className="h-4 w-4" />, "Last name")}
                        {renderEditableField("Phone Number", "phone_number", <PhoneIcon className="h-4 w-4" />, "+1 234 567 890")}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                    >
                        Close
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
