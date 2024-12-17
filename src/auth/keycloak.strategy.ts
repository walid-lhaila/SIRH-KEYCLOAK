import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import * as process from 'node:process';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience: process.env.AUDIENCE?.split(',').map(audience => audience.trim()),
      issuer: process.env.ISSUER,
      algorithms: [process.env.ALGORITHMS],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: process.env.JWKSURI,
      }),
    });
  }

  async validate(payload: any) {

    return {
      userId: payload?.sub,
      username: payload?.preferred_username,
      roles: payload?.realm_access?.roles || [], // Safely retrieve roles
    };
  }
}
