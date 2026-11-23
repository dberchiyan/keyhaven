import { Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { PermissionService } from './permission.service';
import { RateLimitService } from './rate-limit.service';
import { RouteAuditService } from './route-audit.service';
import { RouteCatalog } from './route-catalog';
import { SessionCookies } from './session-cookies';

@Global()
@Module({
    imports: [DiscoveryModule],
    providers: [RateLimitService, RouteCatalog, RouteAuditService, PermissionService, SessionCookies],
    exports: [RateLimitService, RouteCatalog, PermissionService, SessionCookies],
})
export class SecurityModule {}
