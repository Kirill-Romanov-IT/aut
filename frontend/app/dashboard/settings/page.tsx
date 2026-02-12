"use client";

import { useLanguage } from "@/components/language-provider"
import { Language } from "@/lib/translations"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SettingsPage() {
    const { language, setLanguage, t } = useLanguage()

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h2 className="text-2xl font-bold tracking-tight">{t('settings')}</h2>
                <p className="text-sm text-muted-foreground">{t('settingsDescription')}</p>
            </div>

            <div className="px-4 lg:px-6">
                <Card>
                    <CardHeader>
                        <CardTitle>{t('language')}</CardTitle>
                        <CardDescription>
                            {t('selectLanguage')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col space-y-2">
                            <Label htmlFor="language">{t('language')}</Label>
                            <Select
                                value={language}
                                onValueChange={(value) => setLanguage(value as Language)}
                            >
                                <SelectTrigger id="language" className="w-[180px]">
                                    <SelectValue placeholder={t('selectLanguage')} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="en">{t('english')}</SelectItem>
                                    <SelectItem value="ru">{t('russian')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
