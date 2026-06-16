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

  @Post('clients-json')
  async importClientsJson(
    @Body('tenantId') tenantId: string,
    @Body('cycleId') cycleId: string | undefined,
    @Body('data') data: any[]
  ) {
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório.');
    if (!data || !Array.isArray(data)) throw new BadRequestException('O array de dados é obrigatório.');
    return this.importsService.importClientsJson(tenantId, data, cycleId);
  }
}
