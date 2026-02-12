"use client"

import { useLanguage } from "@/components/language-provider"

export default function GenericPage({ title, description }: { title: string, description: string }) {
    const { t } = useLanguage()
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="px-4 lg:px-6">
                <div className="bg-muted/50 flex min-h-[400px] items-center justify-center rounded-xl border border-dashed">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h3 className="text-lg font-semibold">{t('noData')}</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            {t('noDataMessage')}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
