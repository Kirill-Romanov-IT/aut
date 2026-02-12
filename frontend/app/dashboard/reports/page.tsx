"use client"

import { useLanguage } from "@/components/language-provider"
import GenericPage from "../generic-page"

export default function ReportsPage() {
    const { t } = useLanguage()
    return <GenericPage title={t('reportsTitle')} description={t('reportsDescription')} />
}
