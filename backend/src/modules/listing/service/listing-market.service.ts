import { Injectable } from '@nestjs/common';

import { MONEY_SCALE, toDecimal, toMoney } from '@/common/persistence/money';

import { ListingMarketRepository, type PriceMedians } from '../repository/listing-market.repository';
import type { ListingDetailRecord } from '../repository/record/listing.record';
import type { PriceContext } from './listing.types';
import { PRICE_CONTEXT_MIN_SAMPLE } from './listing-limits';

const PERCENT = 100;

interface ChosenMedian {
    scope: PriceContext['scope'];
    median: number;
    sample: number;
}

/**
 * The neighborhood's median when enough comparable homes are there, else the city's; nothing when even the city
 * has fewer than the minimum sample — a median of one or two homes would mislead.
 */
const chooseMedian = (medians: PriceMedians): ChosenMedian | undefined => {
    if (medians.neighborhoodMedian !== null && medians.neighborhoodSample >= PRICE_CONTEXT_MIN_SAMPLE) {
        return { scope: 'NEIGHBORHOOD', median: medians.neighborhoodMedian, sample: medians.neighborhoodSample };
    }
    if (medians.cityMedian !== null && medians.citySample >= PRICE_CONTEXT_MIN_SAMPLE) {
        return { scope: 'CITY', median: medians.cityMedian, sample: medians.citySample };
    }
    return undefined;
};

/** Comparable homes: the same kind and city as one listing — its similar homes and its price against theirs. */
@Injectable()
export class ListingMarketService {
    constructor(private readonly marketRepository: ListingMarketRepository) {}

    findSimilarIds(listing: ListingDetailRecord): Promise<string[]> {
        return this.marketRepository.findSimilarIds({ ...listing, cityId: listing.city.id });
    }

    /** DATA-20: the median arrives as a double from SQL and becomes a Decimal at once; the percent is whole. */
    async priceContextOf(listing: ListingDetailRecord): Promise<PriceContext | null> {
        const medians = await this.marketRepository.findPriceMedians({
            id: listing.id,
            kind: listing.kind,
            cityId: listing.city.id,
            propertyType: listing.propertyType,
            neighborhood: listing.neighborhood,
        });
        const chosen = chooseMedian(medians);
        if (!chosen) {
            return null;
        }
        const median = toDecimal(chosen.median.toFixed(MONEY_SCALE));
        const differencePercent = listing.price.minus(median).div(median).times(PERCENT).toDecimalPlaces(0).toNumber();
        return {
            scope: chosen.scope,
            median: toMoney(median, listing.currency),
            sample: chosen.sample,
            differencePercent,
        };
    }
}
