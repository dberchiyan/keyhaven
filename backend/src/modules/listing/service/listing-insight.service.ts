import { Injectable } from '@nestjs/common';

import type { Principal } from '@/common/security/principal';
import { addUtcDays, toUtcDay } from '@/common/time/utc-day';

import { ListingRepository } from '../repository/listing.repository';
import { ListingInsightRepository } from '../repository/listing-insight.repository';
import { INSIGHT_TOP_LIMIT, type InsightPeriod } from './insight-period';
import type { InsightTarget, ListingInsights, ManagedInsights } from './listing.types';
import { ListingCardService } from './listing-card.service';
import { scopeOf } from './listing-scope';

/** Views and saves per UTC day for the owner's dashboard and for one listing's page. */
@Injectable()
export class ListingInsightService {
    constructor(
        private readonly insightRepository: ListingInsightRepository,
        private readonly listingRepository: ListingRepository,
        private readonly cardService: ListingCardService,
    ) {}

    /** The scope's series and totals against the period before, plus the listings that drew the most interest. */
    async findInsights(principal: Principal, period: InsightPeriod): Promise<ManagedInsights> {
        const scope = scopeOf(principal);
        const insights = await this.insightsOf(scope, period);
        const top = await this.insightRepository.findTopListings(scope, insights.from, insights.to, INSIGHT_TOP_LIMIT);
        const cards = await this.listingRepository.findManagedCardsByIds(top.map((row) => row.id));
        const byId = new Map(cards.map((card) => [card.id, card]));
        return {
            ...insights,
            top: top.flatMap((row) => {
                const card = byId.get(row.id);
                return card
                    ? [{ listing: this.cardService.toManagedCard(card), views: row.views, saves: row.saves }]
                    : [];
            }),
        };
    }

    /** The policy checked ownership. */
    findListingInsights(listingId: string, period: InsightPeriod): Promise<ListingInsights> {
        return this.insightsOf({ kind: 'LISTING', listingId }, period);
    }

    /** DATA-21: the window ends today (UTC) and spans `period` days; the previous one ends the day before it starts. */
    private async insightsOf(target: InsightTarget, period: InsightPeriod): Promise<ListingInsights> {
        const now = new Date();
        const to = toUtcDay(now);
        const from = toUtcDay(addUtcDays(now, -(period - 1)));
        const previousTo = toUtcDay(addUtcDays(now, -period));
        const previousFrom = toUtcDay(addUtcDays(now, -(2 * period - 1)));
        const [series, previous] = await Promise.all([
            this.insightRepository.findSeries(target, from, to),
            this.insightRepository.countTotals(target, previousFrom, previousTo),
        ]);
        const totals = series.reduce(
            (sum, point) => ({ views: sum.views + point.views, saves: sum.saves + point.saves }),
            { views: 0, saves: 0 },
        );
        return { from, to, period, series, totals, previous };
    }
}
