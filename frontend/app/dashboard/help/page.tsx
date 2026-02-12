"use client"

import { useLanguage } from "@/components/language-provider"
import GenericPage from "../generic-page"

export default function HelpPage() {
    const { t } = useLanguage()
    return <GenericPage title={t('helpTitle')} description={t('helpDescription')} />
}
