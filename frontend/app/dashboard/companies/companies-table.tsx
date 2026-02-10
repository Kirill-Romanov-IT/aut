"use strict"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

const companies = [
    {
        name: "Acme Corp",
        status: "Active",
        createdAt: "2023-10-01",
    },
    {
        name: "Globex Corporation",
        status: "Archived",
        createdAt: "2023-08-15",
    },
    {
        name: "Soylent Corp",
        status: "Active",
        createdAt: "2023-09-20",
    },
]

export function CompaniesTable() {
    return (
        <div className="rounded-md border bg-card text-card-foreground shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-foreground">Name</TableHead>
                        <TableHead className="font-semibold text-foreground">Status</TableHead>
                        <TableHead className="text-right font-semibold text-foreground">Created At</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow key={company.name} className="group transition-colors hover:bg-muted/50">
                            <TableCell className="font-medium">{company.name}</TableCell>
                            <TableCell>
                                <Badge
                                    variant={company.status === "Active" ? "default" : "secondary"}
                                    className="px-2 py-0.5 text-xs font-medium"
                                >
                                    {company.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">{company.createdAt}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
