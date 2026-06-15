require('dotenv').config();
process.env.DATABASE_URL = process.env.DIRECT_URL;
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding default system options...');

  const options = [
    // TENANT_SIZE
    { category: 'TENANT_SIZE', label: 'Pequeno (até 20 colaboradores)', value: 'Pequeno (até 20 colaboradores)' },
    { category: 'TENANT_SIZE', label: 'Médio (21 a 100 colaboradores)', value: 'Médio (21 a 100 colaboradores)' },
    { category: 'TENANT_SIZE', label: 'Grande (mais de 100 colaboradores)', value: 'Grande (mais de 100 colaboradores)' },
    
    // TENANT_STATUS
    { category: 'TENANT_STATUS', label: 'Preparação (M0)', value: 'PREPARATION', color: 'blue' },
    { category: 'TENANT_STATUS', label: 'Mapeamento (M1 - M3)', value: 'MAPPING', color: 'amber' },
    { category: 'TENANT_STATUS', label: 'Ativo (Implantação de Rotinas)', value: 'ACTIVE', color: 'emerald' },
    { category: 'TENANT_STATUS', label: 'Inativo / Pausado', value: 'INACTIVE', color: 'slate' },

    // ACCOUNTING_SYSTEM
    { category: 'ACCOUNTING_SYSTEM', label: 'Domínio Sistemas', value: 'Domínio Sistemas' },
    { category: 'ACCOUNTING_SYSTEM', label: 'Alterdata', value: 'Alterdata' },
    { category: 'ACCOUNTING_SYSTEM', label: 'Nasajon', value: 'Nasajon' },
    { category: 'ACCOUNTING_SYSTEM', label: 'ContaAzul', value: 'ContaAzul' },
    { category: 'ACCOUNTING_SYSTEM', label: 'Outro', value: 'Outro' },
  ];

  for (const opt of options) {
    // Check if exists
    const exists = await prisma.systemOption.findFirst({
      where: { category: opt.category, value: opt.value }
    });

    if (!exists) {
      await prisma.systemOption.create({
        data: opt
      });
      console.log(`Created: ${opt.category} -> ${opt.label}`);
    } else {
      console.log(`Already exists: ${opt.category} -> ${opt.label}`);
    }
  }

  console.log('Seeding completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
