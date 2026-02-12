"use client"

import { SectionCards } from "@/components/section-cards"
import { LifecycleKanban } from "@/components/lifecycle-kanban"
import { useLanguage } from "@/components/language-provider"

export default function LifecyclePage() {
    const { t } = useLanguage()
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">{t('lifecycle')}</h2>
                <p className="text-sm text-muted-foreground">
                    {t('settingsDescription')}
                </p>
            </div>
            <SectionCards />
            <div className="px-4 lg:px-6 h-full min-h-[600px]">
                <LifecycleKanban />
            </div>
        </div>
    )
}
