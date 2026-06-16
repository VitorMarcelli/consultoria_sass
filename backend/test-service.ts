import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmployeesService } from './src/employees/employees.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const service = app.get(EmployeesService);
  
  const data = {
    tenantId: "bf059d81-da83-4903-88bc-38bf228eb198",
    cycleId: "b7e28b1e-b8d9-43c3-9d18-77c8e2390f7a",
    name: "Joãozinho",
    role: "Analista",
    level: "Estagiário",
    email: "joaozinho@gmail.com",
    status: "ACTIVE",
    observations: "Qualquer coisa",
    grossSalary: 3000,
    frontId: "c2c019d0-0fb8-4107-ac3e-56f8f1767e7c",
    subdivisionId: null,
    allocatedHours: 8,
    predictableRecurrentTimePercentage: 50,
    unpredictableRecurrentTimePercentage: 20,
    allocationStartDate: "2024-06-16",
    allocationEndDate: null
  };

  try {
    const res = await service.create(data.tenantId, data);
    console.log('Success:', res);
  } catch (e) {
    console.error('Error in service.create:', e);
  }
  
  await app.close();
}

bootstrap();
