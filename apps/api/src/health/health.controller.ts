import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { DatabaseService } from '../database/database.service.js';

@ApiTags('system')
@Controller('health')
export class HealthController {
  constructor(private readonly database: DatabaseService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiOkResponse({ description: 'The API process is running.' })
  live() {
    return { status: 'ok', service: 'cloudprint-api' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiOkResponse({ description: 'The API can reach PostgreSQL.' })
  @ApiServiceUnavailableResponse({ description: 'PostgreSQL is unavailable.' })
  async ready() {
    try {
      await this.database.ping();
      return { status: 'ok', database: 'reachable' };
    } catch {
      throw new HttpException({ status: 'unavailable', database: 'unreachable' }, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
