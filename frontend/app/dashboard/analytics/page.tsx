import { ChartAreaInteractive } from "@/components/chart-area-interactive"
import { SectionCards } from "@/components/section-cards"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
                <p className="text-sm text-muted-foreground">
                    Detailed insights and performance metrics.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
            </div>
            <SectionCards />
        </div>
    )
}
