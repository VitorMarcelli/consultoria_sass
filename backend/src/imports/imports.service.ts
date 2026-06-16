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
              
              // Helper to find a key case-insensitively
              const getVal = (keys: string[]) => {
                const foundKey = Object.keys(row).find(k => 
                  keys.some(expected => k.toLowerCase().trim() === expected.toLowerCase().trim())
                );
                return foundKey ? row[foundKey] : null;
              };

              const name = getVal(['Razão Social', 'Razao Social', 'razaoSocial', 'name', 'Nome']);
              if (!name) continue; // Skip empty/invalid rows
              
              const cnpj = getVal(['CNPJ', 'cnpj']);
              const tradeName = getVal(['Nome Fantasia', 'nomeFantasia', 'tradeName', 'Fantasia']);
              const statusVal = getVal(['Status', 'status']) || 'ACTIVE';
              
              if (cnpj) {
                const existing = await prisma.client.findUnique({ where: { cnpj } });
                if (existing) {
                  await prisma.client.update({
                    where: { id: existing.id },
                    data: {
                      name,
                      tradeName: tradeName || null,
                      status: statusVal,
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
                tradeName: tradeName || null,
                status: statusVal,
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
  async importClientsJson(userId: string, records: any[]) {
    const prisma = await this.getTenantPrisma(userId);
    let count = 0;

    for (const record of records) {
      const row = record as any;
      
      // Helper to find a key case-insensitively
      const getVal = (keys: string[]) => {
        const foundKey = Object.keys(row).find(k => 
          keys.some(expected => k.toLowerCase().trim() === expected.toLowerCase().trim())
        );
        return foundKey ? row[foundKey] : null;
      };

      const name = getVal(['Razão Social', 'Razao Social', 'razaoSocial', 'name', 'Nome']);
      if (!name) continue; // Skip empty/invalid rows
      
      const cnpj = getVal(['CNPJ', 'cnpj']);
      const tradeName = getVal(['Nome Fantasia', 'nomeFantasia', 'tradeName', 'Fantasia']);
      const statusVal = getVal(['Status', 'status']) || 'ACTIVE';
      
      if (cnpj) {
        const existing = await prisma.client.findUnique({ where: { cnpj } });
        if (existing) {
          await prisma.client.update({
            where: { id: existing.id },
            data: {
              name,
              tradeName: tradeName || null,
              status: statusVal,
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
          tradeName: tradeName || null,
          status: statusVal,
        }
      });
      count++;
    }
    
    return { success: true, count, message: `Foram importados/atualizados ${count} clientes com sucesso.` };
  }
}
