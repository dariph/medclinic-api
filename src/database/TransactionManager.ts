import { DataSource, EntityManager } from "typeorm";

import type { ITransactionManager } from "../domain/ports/RepositoryPorts.js";

export class TransactionManager implements ITransactionManager {
  constructor(private readonly dataSource: DataSource) {}

  async execute<T>(
    operation: (manager: EntityManager) => Promise<T>,
  ): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const result = await operation(queryRunner.manager);
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
