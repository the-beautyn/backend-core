import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WorkersService } from '../../../workers/workers.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { WorkerDto } from '../../../workers/dto/worker.dto';
import { WorkersListResponseDto } from '../../../workers/dto/workers-list.response.dto';
import { WorkersSyncJobResponseDto, WorkersSyncResultDto } from '../../../workers/dto/workers-sync-result.dto';
import { UpsertWorkerDto } from '../../../workers/dto/upsert-worker.dto';
import { SalonAccessGuard } from '../../../brand/guards/salon-access.guard';

@ApiTags('Workers')
@Controller('api/v1/salons/:salonId/workers')
export class WorkersAuthenticatedController {
  constructor(private readonly workers: WorkersService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'List workers from Beautyn database for the authenticated owner' })
  @ApiOkResponse({ type: WorkersListResponseDto })
  async pull(
    @Param('salonId') salonId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('q') search?: string,
    @Query('active') active?: string,
  ): Promise<WorkersListResponseDto> {
    const isActive = typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.workers.pull(salonId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      isActive,
    });
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Pull workers directly from connected CRM without persisting' })
  @ApiOkResponse({ type: WorkerDto, isArray: true })
  async pullFromCrm(@Param('salonId') salonId: string): Promise<WorkerDto[]> {
    return await this.workers.pullFromCrm(salonId);
  }

  @Post('crm/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Fetch workers from CRM and persist them locally' })
  @ApiOkResponse({ type: WorkersSyncResultDto })
  async rebaseFromCrm(@Param('salonId') salonId: string): Promise<WorkersSyncResultDto> {
    return await this.workers.rebaseFromCrm(salonId);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Enqueue asynchronous CRM workers sync job' })
  @ApiAcceptedResponse({ type: WorkersSyncJobResponseDto })
  @HttpCode(HttpStatus.ACCEPTED)
  async rebaseFromCrmAsync(@Param('salonId') salonId: string): Promise<WorkersSyncJobResponseDto> {
    return await this.workers.rebaseFromCrmAsync(salonId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Create a worker within CRM and persist locally' })
  @ApiCreatedResponse({ type: WorkerDto })
  async create(@Param('salonId') salonId: string, @Body() dto: UpsertWorkerDto): Promise<WorkerDto> {
    return await this.workers.create(salonId, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Update a worker within CRM and persist locally' })
  @ApiOkResponse({ type: WorkerDto })
  async update(
    @Param('salonId') salonId: string,
    @Param('id') id: string,
    @Body() dto: UpsertWorkerDto,
  ): Promise<WorkerDto> {
    return await this.workers.update(salonId, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard, SalonAccessGuard)
  @ApiOperation({ summary: 'Delete a worker in CRM and remove locally' })
  @ApiNoContentResponse({ description: 'Worker deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('salonId') salonId: string, @Param('id') id: string): Promise<void> {
    await this.workers.delete(salonId, id);
  }
}
