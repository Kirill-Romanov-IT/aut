"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { Company, CompanySheet } from "./company-sheet"

const initialCompanies: Company[] = [
    {
        id: "1",
        name: "Acme Corp",
        employees: 120,
        location: "New York",
        created_at: "2023-10-01",
    },
    {
        id: "2",
        name: "Globex Corporation",
        employees: 500,
        location: "San Francisco",
        created_at: "2023-08-15",
    },
    {
        id: "3",
        name: "Soylent Corp",
        employees: 50,
        location: "Chicago",
        created_at: "2023-09-20",
    },
]

export function CompaniesTable() {
    const router = useRouter()
    const [companies, setCompanies] = React.useState<Company[]>([])
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)
    const [isLoading, setIsLoading] = React.useState(true)

    const fetchCompanies = React.useCallback(async () => {
        setIsLoading(true)
        try {
            const token = localStorage.getItem("token")
            if (!token) {
                router.push("/")
                return
            }

            const response = await fetch("http://localhost:8000/companies", {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            if (response.status === 401) {
                localStorage.removeItem("token")
                router.push("/")
                return
            }

            if (response.ok) {
                const data = await response.json()
                setCompanies(data)
            } else {
                console.error("Failed to fetch companies")
            }
        } catch (error) {
            console.error("Error fetching companies:", error)
        } finally {
            setIsLoading(false)
        }
    }, [router])

    React.useEffect(() => {
        fetchCompanies()

        const handleUpdate = () => {
            fetchCompanies()
        }

        window.addEventListener("companies-updated", handleUpdate)
        return () => {
            window.removeEventListener("companies-updated", handleUpdate)
        }
    }, [fetchCompanies])

    const handleRowClick = (company: Company) => {
        setSelectedCompany(company)
        setIsSheetOpen(true)
    }

    const handleAddCompany = () => {
        const newCompany: Company = {
            id: "",
            name: "New Company",
            employees: 0,
            location: "Unknown",
            createdAt: new Date().toISOString().split('T')[0],
        }
        setSelectedCompany(newCompany)
        setIsSheetOpen(true)
    }

    const handleSave = (updatedCompany: Company) => {
        if (updatedCompany.id) {
            setCompanies(companies.map(c => c.id === updatedCompany.id ? updatedCompany : c))
        } else {
            // Optimistic update, ignoring ID collision for now since backend handles real IDs
            //Ideally we should POST to create
            setCompanies([updatedCompany, ...companies])
        }
    }

    const handleDelete = (id: string) => {
        setCompanies(companies.filter(c => c.id !== id))
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden min-h-[300px]">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="font-semibold text-foreground">Name</TableHead>
                            <TableHead className="font-semibold text-foreground">Employees</TableHead>
                            <TableHead className="font-semibold text-foreground">Location</TableHead>
                            <TableHead className="text-right font-semibold text-foreground">Created At</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : companies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No companies found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            companies.map((company) => (
                                <TableRow
                                    key={company.id}
                                    className="group cursor-pointer transition-colors hover:bg-muted/50"
                                    onClick={() => handleRowClick(company)}
                                >
                                    <TableCell className="font-medium">{company.name}</TableCell>
                                    <TableCell>{company.employees}</TableCell>
                                    <TableCell>{company.location}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {company.created_at ? new Date(company.created_at).toLocaleDateString() : 'N/A'}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-start">
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full w-10 h-10 shadow-sm hover:shadow-md transition-all border-dashed"
                    onClick={handleAddCompany}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <CompanySheet
                company={selectedCompany}
                isOpen={isSheetOpen}
                onClose={() => setIsSheetOpen(false)}
                onSave={handleSave}
                onDelete={handleDelete}
            />
        </div>
    )
}
