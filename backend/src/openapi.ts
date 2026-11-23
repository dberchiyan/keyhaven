import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

import { PAGEABLE_KEY } from './common/dto/pageable';
import { ERROR_CODES, ErrorCode } from './common/exception/error-code';
import { type RouteContract, standardErrorsOf } from './common/exception/standard-errors';
import { IDEMPOTENT_KEY } from './common/idempotency/idempotent.decorator';
import { DEMO_RESTRICTED_KEY } from './common/security/demo.guard';
import { everyone, type Policy } from './common/security/policy';
import { RATE_LIMIT_KEY } from './common/security/rate-limit';
import { RouteCatalog, type RouteHandler } from './common/security/route-catalog';
import { POLICY_KEY, SESSION_COOKIE_SECURITY } from './common/security/security.decorators';

const ERROR_SCHEMA = 'ErrorResponse';
const ERROR_SCHEMA_REF = `#/components/schemas/${ERROR_SCHEMA}`;
const FIRST_ERROR_STATUS = 400;
const CODE_SEPARATOR = ' | ';
const OPERATION_METHODS = ['get', 'put', 'post', 'delete', 'patch', 'head', 'options'] as const;

type OperationObject = NonNullable<OpenAPIObject['paths'][string]['get']>;

const isErrorCode = (value: string): value is ErrorCode => (ERROR_CODES as readonly string[]).includes(value);

/** Builds the OpenAPI document; Zod DTOs are the schemas, the standard errors are derived from the routes (API-34). */
export const buildOpenApiDocument = (app: INestApplication, sessionCookieName: string): OpenAPIObject => {
    const config = new DocumentBuilder()
        .setTitle('Keyhaven API')
        .setVersion('1')
        .addCookieAuth(sessionCookieName, { type: 'apiKey', in: 'cookie' }, SESSION_COOKIE_SECURITY)
        .build();
    const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
    addStandardErrors(document, app.get(RouteCatalog).list(), app.get(Reflector));
    return document;
};

/**
 * API-34: every documented operation gets the kit's errors its route declares, merged with the domain errors of its
 * `@ApiErrors` per status — one response per status, its codes in catalogue order. Excluded endpoints have no
 * operation and are skipped.
 */
const addStandardErrors = (document: OpenAPIObject, routes: readonly RouteHandler[], reflector: Reflector): void => {
    if (document.components?.schemas?.[ERROR_SCHEMA] === undefined) {
        throw new Error(`OpenAPI: the ${ERROR_SCHEMA} schema is missing`);
    }
    const operations = operationsById(document);
    for (const route of routes) {
        const operation = route.operationId === undefined ? undefined : operations.get(route.operationId);
        if (operation) {
            mergeErrors(operation, standardErrorsOf(contractOf(route, reflector)));
        }
    }
};

const operationsById = (document: OpenAPIObject): Map<string, OperationObject> =>
    new Map(
        Object.values(document.paths).flatMap((pathItem) =>
            OPERATION_METHODS.flatMap((method) => {
                const operation = pathItem[method];
                return operation?.operationId === undefined ? [] : [[operation.operationId, operation] as const];
            }),
        ),
    );

const contractOf = (route: RouteHandler, reflector: Reflector): RouteContract => {
    const policy = reflector.get<Policy | undefined>(POLICY_KEY, route.handler);
    return {
        method: route.method,
        policy,
        hasPathParams: route.pathParams.length > 0,
        hasBody: route.hasBody,
        hasQuery: route.hasQuery,
        isPageable: reflector.get<boolean | undefined>(PAGEABLE_KEY, route.handler) === true,
        isIdempotent: reflector.get<boolean | undefined>(IDEMPOTENT_KEY, route.handler) === true,
        isRateLimited: reflector.get<string | undefined>(RATE_LIMIT_KEY, route.handler) !== undefined,
        isDemoRestricted: reflector.get<boolean | undefined>(DEMO_RESTRICTED_KEY, route.handler) === true,
        isOpenToEveryone: policy?.check === everyone,
    };
};

const mergeErrors = (operation: OperationObject, derived: readonly ErrorCode[]): void => {
    const codesByStatus = new Map<string, Set<ErrorCode>>();
    for (const [status, response] of Object.entries(operation.responses)) {
        if (Number(status) >= FIRST_ERROR_STATUS && response && 'description' in response) {
            codesByStatus.set(status, new Set(response.description.split(CODE_SEPARATOR).filter(isErrorCode)));
        }
    }
    for (const code of derived) {
        const status = String(ErrorCode[code]);
        codesByStatus.set(status, new Set([...(codesByStatus.get(status) ?? []), code]));
    }
    for (const [status, codes] of codesByStatus) {
        operation.responses[status] = {
            description: ERROR_CODES.filter((code) => codes.has(code)).join(CODE_SEPARATOR),
            content: { 'application/json': { schema: { $ref: ERROR_SCHEMA_REF } } },
        };
    }
};
