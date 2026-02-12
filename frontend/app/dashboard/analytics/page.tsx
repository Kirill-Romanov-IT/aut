"use client"

import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"
import { useLanguage } from "@/components/language-provider"

export default function AnalyticsPage() {
    const { t } = useLanguage()
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">{t('analyticsTitle')}</h2>
                <p className="text-sm text-muted-foreground">
                    {t('analyticsDescription')}
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
            </div>
            <SectionCards />
        </div>
    )
}
