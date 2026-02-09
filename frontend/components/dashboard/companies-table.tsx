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
import { MoreHorizontal } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface Company {
    id: string
    name: string
    domain: string
    industry: string
    country: string
    status: "active" | "inactive" | "pending"
}

const mockCompanies: Company[] = [
    {
        id: "1",
        name: "Apple Inc.",
        domain: "apple.com",
        industry: "Technology",
        country: "USA",
        status: "active",
    },
    {
        id: "2",
        name: "Google",
        domain: "google.com",
        industry: "Technology",
        country: "USA",
        status: "active",
    },
    {
        id: "3",
        name: "Microsoft",
        domain: "microsoft.com",
        industry: "Software",
        country: "USA",
        status: "active",
    },
    {
        id: "4",
        name: "Volkswagen",
        domain: "vw.com",
        industry: "Automotive",
        country: "Germany",
        status: "inactive",
    },
    {
        id: "5",
        name: "Samsung",
        domain: "samsung.com",
        industry: "Electronics",
        country: "South Korea",
        status: "pending",
    },
]

export function CompaniesTable() {
    // Logic for future API integration (useEffect / React Query) would go here
    const [companies, setCompanies] = React.useState<Company[]>(mockCompanies)

    return (
        <div className="rounded-md border bg-card overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="py-3 px-4 font-semibold text-foreground">Company name</TableHead>
                        <TableHead className="py-3 px-4 font-semibold text-foreground">Domain</TableHead>
                        <TableHead className="py-3 px-4 font-semibold text-foreground">Industry</TableHead>
                        <TableHead className="py-3 px-4 font-semibold text-foreground">Country</TableHead>
                        <TableHead className="py-3 px-4 font-semibold text-foreground">Status</TableHead>
                        <TableHead className="py-3 px-4 font-semibold text-foreground text-right uppercase text-[10px] tracking-wider">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {companies.map((company) => (
                        <TableRow key={company.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell className="py-3 px-4 font-medium">
                                {company.name}
                            </TableCell>
                            <TableCell className="py-3 px-4 text-muted-foreground">
                                {company.domain}
                            </TableCell>
                            <TableCell className="py-3 px-4">{company.industry}</TableCell>
                            <TableCell className="py-3 px-4">{company.country}</TableCell>
                            <TableCell className="py-3 px-4">
                                <Badge
                                    variant={
                                        company.status === "active"
                                            ? "default"
                                            : company.status === "inactive"
                                                ? "destructive"
                                                : "secondary"
                                    }
                                    className="capitalize font-normal text-[11px] px-2 py-0.5"
                                >
                                    {company.status}
                                </Badge>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0" title="Actions">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[160px]">
                                        <DropdownMenuLabel className="text-xs">Actions</DropdownMenuLabel>
                                        <DropdownMenuItem
                                            className="text-xs"
                                            onClick={() => navigator.clipboard.writeText(company.id)}
                                        >
                                            Copy company ID
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem className="text-xs">View details</DropdownMenuItem>
                                        <DropdownMenuItem className="text-xs">Edit company</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}
