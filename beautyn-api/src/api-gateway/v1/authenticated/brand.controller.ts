import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../shared/guards/jwt-auth.guard';
import { envelopeArrayRef, envelopeErrorSchema, envelopeRef } from '../../../shared/utils/swagger-envelope.util';
import { BrandService } from '../../../brand/brand.service';
import { CreateBrandDto } from '../../../brand/dto/create-brand.dto';
import { UpdateBrandDto } from '../../../brand/dto/update-brand.dto';
import { BrandResponseDto } from '../../../brand/dto/brand-response.dto';
import { BrandAccessGuard } from '../../../brand/guards/brand-access.guard';
import { SalonDto } from '../../../salon/dto/salon.dto';
import { BrandMemberResponseDto } from '../../../brand/dto/brand-member-response.dto';
import { SelectBrandSalonDto } from '../../../brand/dto/select-brand-salon.dto';

@ApiTags('Brand')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/brand')
export class BrandController {
  constructor(private readonly brandService: BrandService) {}

  @Get('my')
  @ApiOperation({ summary: 'List brands for current user' })
  @ApiOkResponse(envelopeRef(BrandResponseDto))
  async listMyBrands(@Req() req: Request & { user: { id: string } }) {
    const brands = await this.brandService.listMyBrands(req.user.id);
    return brands.length === 1 ? brands[0] : brands;
  }

  @Post()
  @ApiOperation({ summary: 'Create brand' })
  @ApiCreatedResponse(envelopeRef(BrandResponseDto))
  async createBrand(@Req() req: Request & { user: { id: string } }, @Body() dto: CreateBrandDto) {
    return this.brandService.createBrand(req.user.id, dto);
  }

  @Get(':brandId')
  @ApiOperation({ summary: 'Get brand details' })
  @ApiOkResponse(envelopeRef(BrandResponseDto))
  @ApiBadRequestResponse(envelopeErrorSchema({ statusCode: 404, message: 'Brand not found', error: 'Not Found' }))
  @UseGuards(BrandAccessGuard)
  async getBrand(@Req() req: Request & { user: { id: string } }, @Param('brandId') brandId: string) {
    return this.brandService.getBrand(req.user.id, brandId);
  }

  @Patch(':brandId')
  @ApiOperation({ summary: 'Rename brand' })
  @ApiOkResponse(envelopeRef(BrandResponseDto))
  @UseGuards(BrandAccessGuard)
  async renameBrand(
    @Req() req: Request & { user: { id: string } },
    @Param('brandId') brandId: string,
    @Body() dto: UpdateBrandDto,
  ) {
    return this.brandService.renameBrand(req.user.id, brandId, dto);
  }

  @Get(':brandId/salons')
  @ApiOperation({ summary: 'List salons under brand' })
  @ApiQuery({
    name: 'include',
    required: false,
    description: 'Comma-separated list: services, categories, images, workers',
  })
  @ApiOkResponse(envelopeArrayRef(SalonDto))
  @UseGuards(BrandAccessGuard)
  async listBrandSalons(
    @Req() req: Request & { user: { id: string } },
    @Param('brandId') brandId: string,
    @Query('include') include?: string,
  ) {
    return this.brandService.listBrandSalons(req.user.id, brandId, this.parseInclude(include));
  }

  @Get(':brandId/member')
  @ApiOperation({ summary: 'Get brand membership details for current user' })
  @ApiOkResponse(envelopeRef(BrandMemberResponseDto))
  @UseGuards(BrandAccessGuard)
  async getMember(
    @Req() req: Request & { user: { id: string } },
    @Param('brandId') brandId: string,
  ) {
    return this.brandService.getBrandMember(req.user.id, brandId);
  }

  @Put(':brandId/selected-salon')
  @ApiOperation({ summary: 'Persist last selected salon for brand member' })
  @ApiOkResponse(envelopeRef(BrandMemberResponseDto))
  @UseGuards(BrandAccessGuard)
  async selectSalon(
    @Req() req: Request & { user: { id: string } },
    @Param('brandId') brandId: string,
    @Body() body: SelectBrandSalonDto,
  ) {
    return this.brandService.setLastSelectedSalon(req.user.id, brandId, body.salon_id);
  }

  private parseInclude(include?: string) {
    if (!include) return undefined;
    const tokens = include
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!tokens.length) return undefined;
    const set = new Set(tokens);
    return {
      services: set.has('services'),
      categories: set.has('categories'),
      images: set.has('images'),
      workers: set.has('workers'),
    };
  }
}
