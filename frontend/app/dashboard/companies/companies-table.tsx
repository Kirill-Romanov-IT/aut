"use client"

import * as React from "react"
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
        createdAt: "2023-10-01",
    },
    {
        id: "2",
        name: "Globex Corporation",
        employees: 500,
        location: "San Francisco",
        createdAt: "2023-08-15",
    },
    {
        id: "3",
        name: "Soylent Corp",
        employees: 50,
        location: "Chicago",
        createdAt: "2023-09-20",
    },
]

export function CompaniesTable() {
    const [companies, setCompanies] = React.useState<Company[]>(initialCompanies)
    const [selectedCompany, setSelectedCompany] = React.useState<Company | null>(null)
    const [isSheetOpen, setIsSheetOpen] = React.useState(false)

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
            const newId = (Math.max(0, ...companies.map(c => parseInt(c.id))) + 1).toString()
            setCompanies([...companies, { ...updatedCompany, id: newId }])
        }
    }

    const handleDelete = (id: string) => {
        setCompanies(companies.filter(c => c.id !== id))
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="rounded-md border bg-card text-card-foreground shadow-sm overflow-hidden">
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
                        {companies.map((company) => (
                            <TableRow
                                key={company.id}
                                className="group cursor-pointer transition-colors hover:bg-muted/50"
                                onClick={() => handleRowClick(company)}
                            >
                                <TableCell className="font-medium">{company.name}</TableCell>
                                <TableCell>{company.employees}</TableCell>
                                <TableCell>{company.location}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{company.createdAt}</TableCell>
                            </TableRow>
                        ))}
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
