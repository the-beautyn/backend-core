import { Injectable } from '@nestjs/common';
import { UsersRepository } from './users.repository';
import { UserRole } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  findByEmail(email: string) {
    return this.repo.findByEmail(email);
  }

  create(email: string, role: UserRole) {
    return this.repo.create(email, role);
  }
}
