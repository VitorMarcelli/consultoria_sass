import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { StructuresService } from './structures.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('structures')
@UseGuards(JwtAuthGuard)
export class StructuresController {
  constructor(private readonly structuresService: StructuresService) {}

  @Get('fronts')
  findAllFronts(@Query('tenantId') tenantId: string) {
    return this.structuresService.findAllFronts(tenantId);
  }

  @Post('fronts')
  createFront(@Req() req: any, @Body() createDto: any) {
    return this.structuresService.createFront(
      createDto.tenantId,
      createDto,
      req.user.id,
    );
  }

  @Post('subdivisions')
  createSubdivision(@Body() createDto: any) {
    return this.structuresService.createSubdivision(
      createDto.tenantId,
      createDto,
    );
  }

  @Patch('fronts/:id')
  updateFront(
    @Req() req: any,
    @Param('id') id: string,
    @Body() updateDto: any,
  ) {
    return this.structuresService.updateFront(
      updateDto.tenantId,
      id,
      updateDto,
      req.user.id,
    );
  }

  @Delete('fronts/:id')
  removeFront(
    @Req() req: any,
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.structuresService.removeFront(tenantId, id, req.user.id);
  }

  @Patch('subdivisions/:id')
  updateSubdivision(@Param('id') id: string, @Body() updateDto: any) {
    return this.structuresService.updateSubdivision(
      updateDto.tenantId,
      id,
      updateDto,
    );
  }

  @Delete('subdivisions/:id')
  removeSubdivision(
    @Param('id') id: string,
    @Query('tenantId') tenantId: string,
  ) {
    return this.structuresService.removeSubdivision(tenantId, id);
  }
}
