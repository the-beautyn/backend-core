import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashService {
  hash(value: string) {
    return argon2.hash(value);
  }
  verify(hash: string, plain: string) {
    return argon2.verify(hash, plain);
  }
}
