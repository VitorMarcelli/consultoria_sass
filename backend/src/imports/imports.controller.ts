import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Request,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TenantAccessGuard } from '../auth/tenant-access.guard';

@Controller('imports')
@UseGuards(JwtAuthGuard, TenantAccessGuard)
export class ImportsController {
  constructor(private readonly importsService: ImportsService) {}

  @Post('clients')
  @UseInterceptors(FileInterceptor('file'))
  async importClients(
    @Body('tenantId') tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório.');
    if (!file) throw new BadRequestException('O arquivo não foi enviado.');
    return this.importsService.importClients(tenantId, file.buffer);
  }

  @Post('clients-json')
  async importClientsJson(
    @Body('tenantId') tenantId: string,
    @Body('cycleId') cycleId: string | undefined,
    @Body('data') data: any[],
    @Body('fileName') fileName: string | undefined,
    @Body('startRow') startRow: number | undefined,
    // Template MVP REV03: abas 02_Fiscal/03_Contabil/04_Pessoal, casadas com
    // `data` (01_Clientes) por CNPJ/CPF dentro do service. Cada lote de
    // `data` já manda só as linhas de frente referentes aos CNPJs daquele
    // lote (ver clientes/page.tsx), não a aba inteira a cada chunk.
    @Body('fiscal') fiscal: any[] | undefined,
    @Body('contabil') contabil: any[] | undefined,
    @Body('pessoal') pessoal: any[] | undefined,
  ) {
    if (!tenantId) throw new BadRequestException('tenantId é obrigatório.');
    if (!data || !Array.isArray(data))
      throw new BadRequestException('O array de dados é obrigatório.');
    return this.importsService.importClientsJson(
      tenantId,
      data,
      cycleId,
      fileName,
      startRow,
      fiscal,
      contabil,
      pessoal,
    );
  }
}
