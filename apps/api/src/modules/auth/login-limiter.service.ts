import { createHmac } from 'node:crypto';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';

@Injectable()
export class LoginLimiter {
  private readonly buckets = new Map<string, { failures: number; expiresAt: number }>();
  private readonly secret: Buffer;

  constructor(@Inject(ENVIRONMENT) environment: Environment) {
    this.secret = Buffer.from(environment.JWT_SECRET, 'base64url');
  }

  private key(value: string) {
    return createHmac('sha256', this.secret).update(value).digest('hex');
  }

  private keys(ip: string, email: string) {
    return [this.key(`ip:${ip}`), this.key(`cuenta:${email.toLowerCase()}`)];
  }

  assertAllowed(ip: string, email: string) {
    const now = Date.now();
    for (const key of this.keys(ip, email)) {
      const current = this.buckets.get(key);
      if (current && current.expiresAt > now && current.failures >= 5) {
        throw new HttpException(
          'Demasiados intentos. Espera cinco minutos.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
  }

  failed(ip: string, email: string) {
    const now = Date.now();
    if (this.buckets.size >= 10000) {
      for (const [key, value] of this.buckets) if (value.expiresAt <= now) this.buckets.delete(key);
      while (this.buckets.size >= 10000) this.buckets.delete(this.buckets.keys().next().value!);
    }
    for (const key of this.keys(ip, email)) {
      const current = this.buckets.get(key);
      this.buckets.set(key, {
        failures: (current && current.expiresAt > now ? current.failures : 0) + 1,
        expiresAt: now + 300000,
      });
    }
  }

  succeeded(ip: string, email: string) {
    // Conservar el límite por IP para evitar que un login válido borre otros fallos.
    this.buckets.delete(this.keys(ip, email)[1]!);
  }
}
