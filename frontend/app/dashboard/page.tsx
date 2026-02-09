"use client"

import * as React from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { PlusIcon } from "lucide-react"

import { CompaniesTable } from "@/components/dashboard/companies-table"
import { ImportDialog } from "@/components/dashboard/import-dialog"

export default function Page() {
  const [isImportOpen, setIsImportOpen] = React.useState(false)

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <SectionCards />

              <div className="flex flex-col gap-4 px-4 lg:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
                    <p className="text-sm text-muted-foreground">
                      Manage your company directory and import new data.
                    </p>
                  </div>
                  <Button onClick={() => setIsImportOpen(true)} size="sm">
                    <PlusIcon className="mr-2 h-4 w-4" />
                    Import companies
                  </Button>
                </div>
                <CompaniesTable />
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      <ImportDialog
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
      />
    </SidebarProvider>
  )
}
