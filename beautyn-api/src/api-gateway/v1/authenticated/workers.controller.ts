import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiAcceptedResponse, ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { WorkersService } from '../../../workers/workers.service';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { OwnerRolesGuard } from '../../../shared/guards/roles.guard';
import { WorkerDto } from '../../../workers/dto/worker.dto';
import { WorkersListResponseDto } from '../../../workers/dto/workers-list.response.dto';
import { WorkersSyncJobResponseDto, WorkersSyncResultDto } from '../../../workers/dto/workers-sync-result.dto';
import { UpsertWorkerDto } from '../../../workers/dto/upsert-worker.dto';

@ApiTags('Workers')
@Controller('api/v1/workers')
export class WorkersAuthenticatedController {
  constructor(private readonly workers: WorkersService) {}

  @Get('my')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'List workers from Beautyn database for the authenticated owner' })
  @ApiOkResponse({ type: WorkersListResponseDto })
  async pull(
    @Req() req: Request & { user: { id: string } },
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('q') search?: string,
    @Query('active') active?: string,
  ): Promise<WorkersListResponseDto> {
    const isActive = typeof active === 'string' ? active.toLowerCase() === 'true' : undefined;
    return this.workers.pull(req.user.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
      isActive,
    });
  }

  @Get('crm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Pull workers directly from connected CRM without persisting' })
  @ApiOkResponse({ type: WorkerDto, isArray: true })
  async pullFromCrm(@Req() req: Request & { user: { id: string } }): Promise<WorkerDto[]> {
    return await this.workers.pullFromCrm(req.user.id);
  }

  @Post('crm/sync')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Fetch workers from CRM and persist them locally' })
  @ApiOkResponse({ type: WorkersSyncResultDto })
  async rebaseFromCrm(@Req() req: Request & { user: { id: string } }): Promise<WorkersSyncResultDto> {
    return await this.workers.rebaseFromCrm(req.user.id);
  }

  @Post('crm/sync/async')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Enqueue asynchronous CRM workers sync job' })
  @ApiAcceptedResponse({ type: WorkersSyncJobResponseDto })
  @HttpCode(HttpStatus.ACCEPTED)
  async rebaseFromCrmAsync(@Req() req: Request & { user: { id: string } }): Promise<WorkersSyncJobResponseDto> {
    return await this.workers.rebaseFromCrmAsync(req.user.id);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Create a worker within CRM and persist locally' })
  @ApiCreatedResponse({ type: WorkerDto })
  async create(@Req() req: Request & { user: { id: string } }, @Body() dto: UpsertWorkerDto): Promise<WorkerDto> {
    return await this.workers.create(req.user.id, dto);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Update a worker within CRM and persist locally' })
  @ApiOkResponse({ type: WorkerDto })
  async update(
    @Req() req: Request & { user: { id: string } },
    @Param('id') id: string,
    @Body() dto: UpsertWorkerDto,
  ): Promise<WorkerDto> {
    return await this.workers.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OwnerRolesGuard)
  @ApiOperation({ summary: 'Delete a worker in CRM and remove locally' })
  @ApiNoContentResponse({ description: 'Worker deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Req() req: Request & { user: { id: string } }, @Param('id') id: string): Promise<void> {
    await this.workers.delete(req.user.id, id);
  }
}
