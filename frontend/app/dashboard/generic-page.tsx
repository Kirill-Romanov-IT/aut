export default function GenericPage({ title, description }: { title: string, description: string }) {
    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <div className="px-4 lg:px-6">
                <div className="bg-muted/50 flex min-h-[400px] items-center justify-center rounded-xl border border-dashed">
                    <div className="flex flex-col items-center gap-2 text-center">
                        <h3 className="text-lg font-semibold">No data available</h3>
                        <p className="max-w-sm text-sm text-muted-foreground">
                            There is currently no data to display for {title.toLowerCase()}. Please check back later or start by adding new items.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
