import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController, ApiOperation } from '@nestjs/swagger';

import { Public } from '../security/security.decorators';
import { MetricsService } from './metrics.service';

/**
 * OBS-3: public to the app, because neither nginx (frontend/nginx.conf, deploy) proxies `/metrics` — only `/api/`
 * reaches the backend from outside, so the scraper on the private network needs no session.
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
    constructor(private readonly metrics: MetricsService) {}

    @Get()
    @Public()
    @Header('Content-Type', 'text/plain; version=0.0.4')
    @ApiOperation({ summary: 'Prometheus metrics of this instance', operationId: 'scrapeMetrics' })
    scrape(): Promise<string> {
        return this.metrics.registry.metrics();
    }
}
