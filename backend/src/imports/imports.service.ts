import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClientManager } from '../prisma/prisma-client-manager';
import { parse } from 'csv-parse';

@Injectable()
export class ImportsService {
  constructor(
    private readonly globalPrisma: PrismaService,
    private readonly prismaManager: PrismaClientManager,
  ) {}

  private async getTenantPrisma(userId: string) {
    const user = await this.globalPrisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado.');
    const schemaName = `tenant_${user.tenantId.replace(/-/g, '_')}`;
    return this.prismaManager.getClient(schemaName);
  }

  async importClients(userId: string, fileBuffer: Buffer) {
    const prisma = await this.getTenantPrisma(userId);
    
    return new Promise((resolve, reject) => {
      parse(fileBuffer, { columns: true, skip_empty_lines: true }, async (err, records) => {
        if (err) return reject(err);
        
        try {
          let count = 0;
          for (const record of records) {
            const row = record as any;
            const name = row['Razão Social'] || row['razaoSocial'] || row['name'];
            if (!name) continue; // Skip empty/invalid rows
            
            const cnpj = row['CNPJ'] || row['cnpj'] || null;
            
            if (cnpj) {
              const existing = await prisma.client.findUnique({ where: { cnpj } });
              if (existing) {
                await prisma.client.update({
                  where: { id: existing.id },
                  data: {
                    name,
                    tradeName: row['Nome Fantasia'] || row['nomeFantasia'] || null,
                    status: row['Status'] || row['status'] || 'ACTIVE',
                  }
                });
                count++;
                continue;
              }
            }
            
            await prisma.client.create({
              data: {
                name,
                cnpj,
                tradeName: row['Nome Fantasia'] || row['nomeFantasia'] || null,
                status: row['Status'] || row['status'] || 'ACTIVE',
              }
            });
            count++;
          }
          resolve({ success: true, count, message: `Foram importados/atualizados ${count} clientes com sucesso.` });
        } catch (error) {
          reject(error);
        }
      });
    });
  }
}
