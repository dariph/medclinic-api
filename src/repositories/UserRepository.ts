import { EntityManager, Repository } from "typeorm";

import { AppDataSource } from "../database/data-source.js";
import type { IUserRepository } from "../domain/ports/RepositoryPorts.js";
import { User } from "../entities/User.js";

export class UserRepository implements IUserRepository {
  constructor(
    private readonly defaultManager: EntityManager = AppDataSource.manager,
  ) {}

  private getRepo(manager?: EntityManager): Repository<User> {
    return (manager ?? this.defaultManager).getRepository(User);
  }

  async findByEmail(
    email: string,
    manager?: EntityManager,
  ): Promise<User | null> {
    return this.getRepo(manager)
      .createQueryBuilder("user")
      .where("user.email = :email", { email })
      .addSelect("user.password")
      .getOne();
  }

  async findById(id: string, manager?: EntityManager): Promise<User | null> {
    return this.getRepo(manager).findOneBy({ id });
  }

  create(data: Partial<User>, manager?: EntityManager): User {
    return this.getRepo(manager).create(data);
  }

  async save(user: User, manager?: EntityManager): Promise<User> {
    return this.getRepo(manager).save(user);
  }
}
