"use client"

import { useLanguage } from "@/components/language-provider"
import GenericPage from "../generic-page"

export default function DataLibraryPage() {
    const { t } = useLanguage()
    return <GenericPage title={t('dataLibraryTitle')} description={t('dataLibraryDescription')} />
}
