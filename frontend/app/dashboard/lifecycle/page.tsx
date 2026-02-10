import { SectionCards } from "@/components/section-cards"
import { ChartAreaInteractive } from "@/components/chart-area-interactive"

export default function LifecyclePage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">Lifecycle</h2>
                <p className="text-sm text-muted-foreground">
                    Track the lifecycle of your projects.
                </p>
            </div>
            <SectionCards />
            <div className="px-4 lg:px-6">
                <div className="bg-muted/50 flex aspect-video items-center justify-center rounded-xl border">
                    <p className="text-muted-foreground">Lifecycle visualization coming soon...</p>
                </div>
            </div>
        </div>
    )
}
