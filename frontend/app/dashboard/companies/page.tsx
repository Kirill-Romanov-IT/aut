import { CompaniesTable } from "./companies-table"

export default function CompaniesPage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
                <p className="text-sm text-muted-foreground">Manage and track all your active and archived companies in one central place.</p>
            </div>
            <div className="px-4 lg:px-6 flex flex-col gap-4">
                <main className="w-full">
                    <CompaniesTable />
                </main>
            </div>
        </div>
    )
}
