import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, Request, BadRequestException, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('imports')
@UseGuards(JwtAuthGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('clients')
  @UseInterceptors(FileInterceptor('file'))
  async importClients(
    @Body('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório.');
    if (!file) throw new BadRequestException('O arquivo não foi enviado.');
    return this.importsService.importClients(tenantId, file.buffer);
  }
}
