const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncUsers() {
  try {
    // get users from auth.users
    const authUsers = await prisma.$queryRaw`SELECT id, email, raw_user_meta_data FROM auth.users`;
    console.log("Auth users found:", authUsers.length);
    
    for (const au of authUsers) {
      console.log("Auth user:", au.email);
      // check if in public.User
      const pubUser = await prisma.user.findUnique({ where: { id: au.id } });
      if (!pubUser) {
         console.log("Inserting user into public.User...");
         // We need a tenantId. 
         // If no tenantId is in metadata, what do we do?
         let tenantId = au.raw_user_meta_data?.tenant_id;
         
         // Let's create a default tenant if none exists.
         if (!tenantId) {
             const defaultTenant = await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
             if (defaultTenant) {
                tenantId = defaultTenant.id;
             } else {
                const newTenant = await prisma.tenant.create({
                    data: {
                        name: 'Consultoria Principal',
                        slug: 'principal'
                    }
                });
                tenantId = newTenant.id;
             }
         }
         
         await prisma.user.create({
           data: {
             id: au.id,
             email: au.email,
             name: au.raw_user_meta_data?.name || 'Admin',
             role: 'ADMIN',
             tenantId: tenantId
           }
         });
         console.log("Inserted!");
      }
    }
  } catch(e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

syncUsers();
