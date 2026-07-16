import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Patch,
  Body,
  Post,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateConsultantDto } from './dto/create-consultant.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getMe(@Request() req: any) {
    // req.user comes from SupabaseStrategy validate method
    return this.usersService.findMe(req.user.id, req.user.email);
  }

  @Patch('me')
  async updateMe(@Request() req: any, @Body() body: { name?: string }) {
    return this.usersService.updateMe(req.user.id, body);
  }

  @Get()
  async findAll(@Request() req: any) {
    const dbUser = await this.usersService.findMe(req.user.id, req.user.email);

    // Se for ADMIN, pode ver todos os usuários do sistema
    if (dbUser.role === 'ADMIN') {
      return this.usersService.findAll();
    }

    // Caso contrário, vê apenas os do mesmo tenant
    return this.usersService.findAllByTenant(dbUser.tenantId);
  }

  @Patch(':id/role')
  async updateRole(
    @Request() req: any,
    @Param('id') id: string,
    @Body('role') role: 'ADMIN' | 'LEADER' | 'CONSULTANT',
  ) {
    return this.usersService.updateRole(req.user.id, id, role);
  }

  @Post('consultant')
  async createConsultant(
    @Request() req: any,
    @Body() body: CreateConsultantDto,
  ) {
    return this.usersService.createConsultant(req.user.id, body);
  }

  @Delete('consultant/:id')
  async deleteConsultant(@Request() req: any, @Param('id') id: string) {
    return this.usersService.deleteConsultant(req.user.id, id);
  }
}
