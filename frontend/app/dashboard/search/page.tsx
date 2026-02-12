"use client"

import { useLanguage } from "@/components/language-provider"
import GenericPage from "../generic-page"

export default function SearchPage() {
    const { t } = useLanguage()
    return <GenericPage title={t('searchTitle')} description={t('searchDescription')} />
}
