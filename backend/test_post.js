const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenantId = '11fad339-d794-4275-a7c5-0e7f157904fe';
  const cycleId = 'ad97be13-4c29-4b94-98c8-6856807398e9'; // from screenshot url
  const schemaName = `tenant_${tenantId.replace(/-/g, '_')}`;
  
  const urlWithSchema = new URL(process.env.DATABASE_URL);
  urlWithSchema.searchParams.set('schema', schemaName);

  const tenantPrisma = new PrismaClient({
    datasources: { db: { url: urlWithSchema.toString() } }
  });

  const data = {
    name: "João da Silva",
    role: "Analista Fiscal",
    level: "Estagiário",
    email: "joao.dasilva@gmail.com",
    status: "ACTIVE",
    observations: "",
    grossSalary: 3000,
    frontId: "c2c8f828-5c4d-4d7a-8f5b-1c5c6f1d0b3c", // We will replace this with a real frontId
    subdivisionId: null,
    allocatedHours: 8,
    predictableRecurrentTimePercentage: 50,
    unpredictableRecurrentTimePercentage: 20,
    allocationStartDate: "2025-06-16",
    allocationEndDate: null,
    cycleId: cycleId
  };

  // Find a valid frontId first
  const front = await tenantPrisma.operationalFront.findFirst();
  if (!front) {
    console.log("No OperationalFront found.");
    return;
  }
  data.frontId = front.id;

  try {
    const result = await tenantPrisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          name: data.name,
          email: data.email,
          role: data.role,
          level: data.level || null,
          status: data.status || 'ACTIVE',
          grossSalary: data.grossSalary ? parseFloat(data.grossSalary) : null,
          observations: data.observations || null,
        }
      });

      if (data.cycleId && data.frontId) {
        await tx.employeeCycleAllocation.create({
          data: {
            employeeId: employee.id,
            cycleId: data.cycleId,
            frontId: data.frontId,
            subdivisionId: data.subdivisionId || null,
            dailyAvailableTime: (data.allocatedHours !== null && data.allocatedHours !== undefined && data.allocatedHours !== '') ? parseFloat(data.allocatedHours) : 8,
            predictableRecurrentTimePercentage: (data.predictableRecurrentTimePercentage !== null && data.predictableRecurrentTimePercentage !== undefined && data.predictableRecurrentTimePercentage !== '') ? parseFloat(data.predictableRecurrentTimePercentage) : null,
            unpredictableRecurrentTimePercentage: (data.unpredictableRecurrentTimePercentage !== null && data.unpredictableRecurrentTimePercentage !== undefined && data.unpredictableRecurrentTimePercentage !== '') ? parseFloat(data.unpredictableRecurrentTimePercentage) : null,
            allocationStartDate: (data.allocationStartDate && data.allocationStartDate !== '') ? new Date(data.allocationStartDate) : null,
            allocationEndDate: (data.allocationEndDate && data.allocationEndDate !== '') ? new Date(data.allocationEndDate) : null,
            status: data.allocationStatus || 'ACTIVE',
          }
        });
      }
      return employee;
    });
    console.log("Success:", result);
  } catch (err) {
    console.error("Prisma Error:", err);
  } finally {
    await tenantPrisma.$disconnect();
    await prisma.$disconnect();
  }
}

main().catch(console.error);
