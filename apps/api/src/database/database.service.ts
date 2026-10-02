import { Injectable } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { createDatabaseConnection, type DatabaseConnection } from '@cloudprint/database';
import { parseRuntimeConfig } from '../config/runtime-config.js';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  private readonly connection: DatabaseConnection;

  constructor() {
    this.connection = createDatabaseConnection(parseRuntimeConfig(process.env).databaseUrl);
  }

  async ping(): Promise<void> {
    await this.connection.ping();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.connection.close();
  }
}
