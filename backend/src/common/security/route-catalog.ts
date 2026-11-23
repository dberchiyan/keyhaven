import { Injectable, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { RouteParamtypes } from '@nestjs/common/enums/route-paramtypes.enum';
import { DiscoveryService, MetadataScanner, Reflector } from '@nestjs/core';
import { DECORATORS } from '@nestjs/swagger';

export type MetadataTarget = Parameters<Reflector['get']>[1];

export interface RouteHandler {
    handler: MetadataTarget;
    method: RequestMethod;
    route: string;
    pathParams: string[];
    operationId: string | undefined;
    hasBody: boolean;
    hasQuery: boolean;
}

const PATH_PARAM = /:([A-Za-z]+)\b/g;

/** `@Body()` / `@Query()` without a property name bind the whole input: the DTO the validation pipe checks. */
const isWholeArgument = (argument: unknown): boolean =>
    typeof argument === 'object' && argument !== null && Reflect.get(argument, 'data') === undefined;

/** Every HTTP handler of the app with what its decorators declare — read by the route audit and the OpenAPI build. */
@Injectable()
export class RouteCatalog {
    constructor(
        private readonly discovery: DiscoveryService,
        private readonly scanner: MetadataScanner,
        private readonly reflector: Reflector,
    ) {}

    list(): RouteHandler[] {
        return this.discovery.getControllers().flatMap((wrapper) => {
            const instance: unknown = wrapper.instance;
            if (typeof instance !== 'object' || instance === null) {
                return [];
            }
            const prototype: object = Object.getPrototypeOf(instance) as object;
            const controllerPath = this.pathOf(wrapper.metatype);
            return this.scanner
                .getAllMethodNames(prototype)
                .flatMap((methodName) => this.routeOf(prototype, methodName, controllerPath));
        });
    }

    private routeOf(prototype: object, methodName: string, controllerPath: string): RouteHandler[] {
        const handler: unknown = Reflect.get(prototype, methodName);
        if (typeof handler !== 'function') {
            return [];
        }
        const method = this.reflector.get<RequestMethod | undefined>(METHOD_METADATA, handler);
        if (method === undefined) {
            return [];
        }
        const path = `/${[controllerPath, this.pathOf(handler)].filter(Boolean).join('/')}`;
        const operation = this.reflector.get<{ operationId?: string } | undefined>(DECORATORS.API_OPERATION, handler);
        const routeArguments: unknown = Reflect.getMetadata(ROUTE_ARGS_METADATA, prototype.constructor, methodName);
        const argumentsByKey = typeof routeArguments === 'object' && routeArguments !== null ? routeArguments : {};
        const hasWhole = (type: RouteParamtypes): boolean =>
            Object.entries(argumentsByKey).some(
                ([key, argument]) => key.startsWith(`${type}:`) && isWholeArgument(argument),
            );
        return [
            {
                handler,
                method,
                route: `${RequestMethod[method]} ${path}`,
                pathParams: [...path.matchAll(PATH_PARAM)].flatMap((match) => (match[1] ? [match[1]] : [])),
                operationId: operation?.operationId,
                hasBody: hasWhole(RouteParamtypes.BODY),
                hasQuery: hasWhole(RouteParamtypes.QUERY),
            },
        ];
    }

    private pathOf(target: unknown): string {
        if (typeof target !== 'function') {
            return '';
        }
        const path = this.reflector.get<string | string[] | undefined>(PATH_METADATA, target);
        const value = Array.isArray(path) ? path.join(',') : (path ?? '');
        return value.replace(/^\/+|\/+$/g, '');
    }
}
