"use client"

import { useLanguage } from "@/components/language-provider"
import GenericPage from "../generic-page"

export default function WordAssistantPage() {
    const { t } = useLanguage()
    return <GenericPage title={t('wordAssistantTitle')} description={t('wordAssistantDescription')} />
}
