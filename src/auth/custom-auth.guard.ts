import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { KeycloakStrategy } from './keycloak.strategy';
import { Observable } from 'rxjs';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class CustomAuthGuard implements CanActivate {
  constructor(private keycloakStrategy: KeycloakStrategy) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const rpcContext = context.switchToRpc();
    const data = rpcContext.getData();

    const token = data.token?.split(' ')[1];
    if (!token) {
      console.log('No token provided');
      return false;
    }

    return new Promise((resolve) => {
      try {
        const decodedToken: any = jwt.decode(token);

        if (!decodedToken) {
          console.log('Invalid token');
          return resolve(false);
        }

        this.keycloakStrategy
          .validate(decodedToken)
          .then((user) => {
            rpcContext.getContext().user = user;
            resolve(true);
          })
          .catch(() => {
            resolve(false);
          });
      } catch (error) {
        resolve(false);
      }
    });
  }
}
