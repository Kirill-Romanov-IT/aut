"use client"

import * as React from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { MapPinIcon, UserIcon, PhoneIcon, Building2Icon } from "lucide-react"
import { useLanguage } from "@/components/language-provider"

export type ArchivedCompany = {
    id: number | string
    company_name: string
    location: string
    name: string
    sur_name: string
    phone_number: string
    archived_at?: string
}

interface ArchivedCompanyDialogProps {
    company: ArchivedCompany | null
    isOpen: boolean
    onClose: () => void
}

export function ArchivedCompanyDialog({
    company,
    isOpen,
    onClose,
}: ArchivedCompanyDialogProps) {
    const { t } = useLanguage()

    if (!company) return null

    const renderField = (
        label: string,
        value: string | undefined,
        icon: React.ReactNode
    ) => (
        <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {label}
            </label>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-muted/20 transition-colors">
                <div className="h-8 w-8 rounded-lg bg-background flex items-center justify-center text-muted-foreground">
                    {icon}
                </div>
                <div className="flex items-center justify-between flex-1 group/field">
                    <span className="text-sm font-medium text-foreground/80">
                        {value || t('notAvailable')}
                    </span>
                </div>
            </div>
        </div>
    )

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border-none shadow-2xl p-0 bg-background/95 backdrop-blur-sm">
                <DialogHeader className="p-0">
                    <div className="bg-primary/5 p-8 flex flex-col items-center text-center gap-6 rounded-t-2xl">
                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-2xl font-bold text-primary">
                                {company.company_name.charAt(0)}
                            </span>
                        </div>
                        <div className="space-y-2">
                            <DialogTitle className="text-xl font-bold tracking-tight">
                                {company.company_name}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                {t('companyDetails')}: {company.company_name}
                            </DialogDescription>
                            <div className="flex items-center justify-center gap-2">
                                <Badge variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider">
                                    {t('archive')}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-8 space-y-6">
                    <div className="grid gap-4">
                        {renderField(t('companyName'), company.company_name, <Building2Icon className="h-4 w-4" />)}
                        {renderField(t('location'), company.location, <MapPinIcon className="h-4 w-4" />)}
                        {renderField(t('contactName'), company.name, <UserIcon className="h-4 w-4" />)}
                        {renderField(t('surname'), company.sur_name, <UserIcon className="h-4 w-4" />)}
                        {renderField(t('phone'), company.phone_number, <PhoneIcon className="h-4 w-4" />)}
                        {company.archived_at && renderField(t('archivedAt') || 'Archived At', new Date(company.archived_at).toLocaleString(), <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>)}
                    </div>

                    <div className="flex flex-col gap-2">
                        <DialogClose asChild>
                            <button
                                className="w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                            >
                                {t('close')}
                            </button>
                        </DialogClose>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
