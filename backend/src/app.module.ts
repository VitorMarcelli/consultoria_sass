import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { EmployeesModule } from './employees/employees.module';
import { StructuresModule } from './structures/structures.module';
import { DeliveriesModule } from './deliveries/deliveries.module';
import { ImportsModule } from './imports/imports.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AllocationsModule } from './allocations/allocations.module';
import { ManagementCyclesModule } from './management-cycles/management-cycles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    ClientsModule,
    EmployeesModule,
    StructuresModule,
    DeliveriesModule,
    ImportsModule,
    NotificationsModule,
    AllocationsModule,
    ManagementCyclesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
