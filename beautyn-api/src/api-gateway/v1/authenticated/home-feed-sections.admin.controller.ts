import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HomeFeedSectionConfigService } from '../../../home-feed/home-feed-section-config.service';
import { CreateHomeFeedSectionDto } from '../../../home-feed/dto/create-home-feed-section.dto';
import { UpdateHomeFeedSectionDto } from '../../../home-feed/dto/update-home-feed-section.dto';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../../../shared/guards/roles.guard';

@ApiTags('Home Feed Sections (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@Controller('api/v1/admin/home-feed-sections')
export class HomeFeedSectionsAdminController {
  constructor(private readonly sectionConfigService: HomeFeedSectionConfigService) {}

  @Get()
  @ApiOperation({ summary: 'List all home feed sections' })
  @ApiOkResponse({ description: 'List of sections' })
  async list() {
    return this.sectionConfigService.list();
  }

  @Post()
  @ApiOperation({ summary: 'Create home feed section' })
  @ApiCreatedResponse({ description: 'Section created' })
  async create(@Body() dto: CreateHomeFeedSectionDto) {
    return this.sectionConfigService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update home feed section' })
  @ApiOkResponse({ description: 'Section updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateHomeFeedSectionDto,
  ) {
    return this.sectionConfigService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete home feed section' })
  @ApiNoContentResponse({ description: 'Section deleted' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', new ParseUUIDPipe()) id: string): Promise<void> {
    await this.sectionConfigService.delete(id);
  }
}
