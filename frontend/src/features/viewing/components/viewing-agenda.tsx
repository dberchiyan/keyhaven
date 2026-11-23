import Typography from '@mui/material/Typography';
import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { formatDayHeading, relativeDayName, zonedDayOf } from '../format';
import type { Viewing } from '../types';
import { ViewingCard } from './viewing-card';

export interface ViewingAgendaProps {
    viewings: readonly Viewing[];
    audience: 'tenant' | 'owner';
    canDecide?: boolean;
    hideListing?: boolean;
    onChanged?: () => void;
}

interface DayGroup {
    day: string;
    timeZone: string;
    viewings: Viewing[];
}

/** Consecutive viewings of one local day — in each home's own zone (QRY-22 exception) — under one heading, order kept. */
const groupByDay = (viewings: readonly Viewing[]): DayGroup[] => {
    const groups: DayGroup[] = [];
    for (const viewing of viewings) {
        const timeZone = viewing.listing.city.timeZone;
        const day = zonedDayOf(viewing.startsAt, timeZone);
        const last = groups[groups.length - 1];
        if (last?.day === day) {
            last.viewings.push(viewing);
            continue;
        }
        groups.push({ day, timeZone, viewings: [viewing] });
    }
    return groups;
};

/**
 * Viewings as an agenda: a heading per day ("Today · Mon, Nov 16"), the day's viewings as rows
 * under it with the hours only — the way a calendar's day view reads.
 */
export function ViewingAgenda({
    viewings,
    audience,
    canDecide,
    hideListing,
    onChanged,
}: ViewingAgendaProps): ReactElement {
    const { t, i18n } = useTranslation('viewing');
    const [now] = useState(() => Date.now());
    return (
        <div className="flex flex-col gap-8">
            {groupByDay(viewings).map((group) => {
                const relative = relativeDayName(group.day, group.timeZone, now, i18n.language);
                const date = formatDayHeading(group.day, i18n.language);
                return (
                    <section key={group.day} aria-label={date} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between gap-4 px-1">
                            <Typography variant="subtitle2" component="h3" className="flex items-baseline gap-2">
                                {relative ? (
                                    <>
                                        <span className="capitalize">{relative}</span>
                                        <Typography variant="caption" component="span" color="textSecondary">
                                            {date}
                                        </Typography>
                                    </>
                                ) : (
                                    date
                                )}
                            </Typography>
                            <Typography variant="caption" color="textSecondary" className="app-tabular">
                                {t('agenda.count', { count: group.viewings.length })}
                            </Typography>
                        </div>
                        <ol className="m-0 flex list-none flex-col gap-2 p-0">
                            {group.viewings.map((viewing) => (
                                <li key={viewing.id}>
                                    <ViewingCard
                                        viewing={viewing}
                                        audience={audience}
                                        showDate={false}
                                        {...(canDecide === undefined ? {} : { canDecide })}
                                        {...(hideListing === undefined ? {} : { hideListing })}
                                        {...(onChanged === undefined ? {} : { onChanged })}
                                    />
                                </li>
                            ))}
                        </ol>
                    </section>
                );
            })}
        </div>
    );
}
