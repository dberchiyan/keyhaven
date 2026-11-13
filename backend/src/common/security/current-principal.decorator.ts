import { createParamDecorator } from '@nestjs/common';
import { ClsServiceManager } from 'nestjs-cls';
import { NotAuthenticatedException } from '../exception/api.exception';
import type { RequestContext } from '../context/request-context';
import type { Principal } from './principal';

/** The visitor's principal on a public route: null without a session. */
export const OptionalPrincipal = createParamDecorator(
  (): Principal | null =>
    ClsServiceManager.getClsService<RequestContext>().get('principal') ?? null,
);

/** The principal of an `@Authorize`d handler. */
export const CurrentPrincipal = createParamDecorator((): Principal => {
  const principal = ClsServiceManager.getClsService<RequestContext>().get('principal');
  if (!principal) {
    throw new NotAuthenticatedException();
  }
  return principal;
});
