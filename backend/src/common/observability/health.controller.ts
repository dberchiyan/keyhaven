import { Controller, Get, Header, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { HealthResponse } from '../dto/health.response';
import { UpstreamUnavailableException } from '../exception/api.exception';
import { ApiErrors } from '../exception/api-errors.decorator';
import { PersistenceHealthIndicator } from '../persistence/persistence-health.indicator';
import { Public } from '../security/security.decorators';

const DATABASE_INDICATOR = 'database';

/** OBS-2: cheap and never cached — an orchestrator asks often and must see the answer of now. */
@ApiTags('Health')
@Controller()
export class HealthController {
    constructor(private readonly persistence: PersistenceHealthIndicator) {}

    @Get('health')
    @Public()
    @Header('Cache-Control', 'no-store')
    @ApiOperation({ summary: 'Report that the process is running', operationId: 'checkLiveness' })
    @ZodResponse({ status: HttpStatus.OK, type: HealthResponse })
    live(): HealthResponse {
        return { status: 'ok' };
    }

    @Get('ready')
    @Public()
    @Header('Cache-Control', 'no-store')
    @ApiOperation({ summary: 'Report whether the service can take traffic', operationId: 'checkReadiness' })
    @ZodResponse({ status: HttpStatus.OK, type: HealthResponse })
    @ApiErrors('UPSTREAM_UNAVAILABLE')
    async ready(): Promise<HealthResponse> {
        const result = await this.persistence.isHealthy(DATABASE_INDICATOR);
        if (result[DATABASE_INDICATOR]?.status !== 'up') {
            throw new UpstreamUnavailableException();
        }
        return { status: 'ok' };
    }
}
