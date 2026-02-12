import { SectionCards } from "@/components/section-cards"
import { LifecycleKanban } from "@/components/lifecycle-kanban"

export default function LifecyclePage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">Lifecycle</h2>
                <p className="text-sm text-muted-foreground">
                    Track the lifecycle of your companies.
                </p>
            </div>
            <SectionCards />
            <div className="px-4 lg:px-6 h-full min-h-[600px]">
                <LifecycleKanban />
            </div>
        </div>
    )
}
