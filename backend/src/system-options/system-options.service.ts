import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemOptionsService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return this.prisma.systemOption.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.systemOption.findMany({
      orderBy: { label: 'asc' },
    });
  }

  async findOne(id: string) {
    const option = await this.prisma.systemOption.findUnique({
      where: { id },
    });
    if (!option) throw new NotFoundException('Option not found');
    return option;
  }

  async update(id: string, data: any) {
    const option = await this.findOne(id);
    return this.prisma.systemOption.update({
      where: { id: option.id },
      data,
    });
  }

  async remove(id: string) {
    const option = await this.findOne(id);
    return this.prisma.systemOption.delete({
      where: { id: option.id },
    });
  }
}
