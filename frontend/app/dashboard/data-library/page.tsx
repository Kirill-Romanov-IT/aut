"use client"

import * as React from "react"
import { useLanguage } from "@/components/language-provider"
import { ArchivedCompaniesTable } from "./archived-companies-table"
import { useRouter } from "next/navigation"

export default function DataLibraryPage() {
    const { t } = useLanguage()
    const router = useRouter()
    const [companies, setCompanies] = React.useState([])
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchArchivedCompanies = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/archived-companies", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.ok) {
                const data = await response.json()
                setCompanies(data)
            }
        } catch (error) {
            console.error("Fetch archived companies error:", error)
        } finally {
            setIsLoading(false)
        }
    }, [router])

    React.useEffect(() => {
        fetchArchivedCompanies()
    }, [fetchArchivedCompanies])

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">{t('archiveTitle')}</h2>
                    <p className="text-muted-foreground">
                        {t('archiveDescription')}
                    </p>
                </div>
            </div>
            <ArchivedCompaniesTable
                companies={companies}
                isLoading={isLoading}
                onUpdate={fetchArchivedCompanies}
            />
        </div>
    )
}
