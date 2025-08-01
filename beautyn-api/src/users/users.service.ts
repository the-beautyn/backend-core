import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  create(email: string, passwordHash: string, role: string) {
    return this.repo.create(email, passwordHash, role);
  }
}
