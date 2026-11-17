import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';

import type { ApiError } from '@/shared/api/api-error';
import { DAY_MS, HOURS_PER_DAY, ISO_DAY_LENGTH } from '@/shared/lib/units';
import { todayUtcIso } from '@/shared/lib/utc-day';

import { SLOT_DAYS } from '../api/viewing-api';
import type { ViewingSlot, ViewingSlotDay, ViewingSlots } from '../types';
import { useViewingSlots } from './use-viewing-queries';

const MORNING_END_HOUR = 12;
const AFTERNOON_END_HOUR = 17;

const PARTS = [
    { key: 'morning', from: 0, to: MORNING_END_HOUR },
    { key: 'afternoon', from: MORNING_END_HOUR, to: AFTERNOON_END_HOUR },
    { key: 'evening', from: AFTERNOON_END_HOUR, to: HOURS_PER_DAY },
] as const;

export type DayPartKey = (typeof PARTS)[number]['key'];

export interface DayPart {
    key: DayPartKey;
    slots: ViewingSlot[];
}

export interface SlotPickerView {
    data: ViewingSlots;
    firstDay: string;
    lastDay: string;
    today: string;
    active: ViewingSlotDay | undefined;
    cells: (ViewingSlotDay | undefined)[];
    parts: DayPart[];
    canGoBack: boolean;
    canGoForward: boolean;
}

export interface UseSlotPickerResult {
    slots: UseQueryResult<ViewingSlots, ApiError>;
    view: SlotPickerView | undefined;
    chooseDay: (day: string) => void;
    page: (direction: -1 | 1) => void;
}

const addDays = (day: string, days: number): string =>
    new Date(new Date(`${day}T00:00:00Z`).getTime() + days * DAY_MS).toISOString().slice(0, ISO_DAY_LENGTH);

/** The hour of a slot in the home's zone — times are grouped as the home's morning, not the visitor's. */
const hourInZone = (iso: string, timeZone: string): number =>
    Number(new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(iso)));

/** Morning, afternoon and evening — the parts of a day people plan a visit by; empty parts drop out. */
const partsOf = (day: ViewingSlotDay | undefined, timeZone: string): DayPart[] =>
    day
        ? PARTS.map((part) => ({
              key: part.key,
              slots: day.slots.filter((slot) => {
                  const hour = hourInZone(slot.startsAt, timeZone);
                  return hour >= part.from && hour < part.to;
              }),
          })).filter((part) => part.slots.length > 0)
        : [];

/**
 * The grid starts on the Sunday of the first day, so weekdays line up under their names; the
 * chosen day falls back to the first one with times, so the picker never opens on an empty day.
 */
const buildView = (data: ViewingSlots, chosenDay: string | undefined, isFirstPage: boolean): SlotPickerView => {
    const days = data.days;
    const firstDay = days[0]?.day ?? data.from;
    const lastDay = days[days.length - 1]?.day ?? data.from;
    const firstWithSlots = days.find((day) => day.slots.length > 0);
    const active = days.find((day) => day.day === chosenDay && day.slots.length > 0) ?? firstWithSlots;
    const leadingBlanks = new Date(`${firstDay}T12:00:00Z`).getUTCDay();
    return {
        data,
        firstDay,
        lastDay,
        today: todayUtcIso(),
        active,
        cells: [...Array<undefined>(leadingBlanks).fill(undefined), ...days],
        parts: partsOf(active, data.timeZone),
        canGoBack: !isFirstPage,
        canGoForward: lastDay < data.horizonEndsAt,
    };
};

/**
 * A fortnight of slots at a time (the API's most) with paging and the chosen day (ARCH-31).
 * Moving or choosing a day drops the chosen slot, so a time is never booked on a day not shown.
 */
export const useSlotPicker = (
    listingId: string,
    onSelect: (slot: ViewingSlot | undefined) => void,
): UseSlotPickerResult => {
    const [from, setFrom] = useState<string | undefined>(undefined);
    const [chosenDay, setChosenDay] = useState<string | undefined>(undefined);
    const slots = useViewingSlots(listingId, from);
    const data = slots.data;
    const view = data?.isOpen ? buildView(data, chosenDay, from === undefined) : undefined;

    return {
        slots,
        view,
        chooseDay: (day) => {
            setChosenDay(day);
            onSelect(undefined);
        },
        page: (direction) => {
            if (!data) {
                return;
            }
            const next = addDays(data.from, direction * SLOT_DAYS);
            setFrom(direction === -1 && next <= todayUtcIso() ? undefined : next);
            setChosenDay(undefined);
            onSelect(undefined);
        },
    };
};
