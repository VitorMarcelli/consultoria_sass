const { Client } = require('pg');

const OLD_DB_URL = "postgresql://postgres.gxxcarfqpdmnniqfwhfa:EzzrLKYYMosiFpK3@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
const NEW_DB_URL = "postgresql://postgres.sxutfgotljbdyzqitwhy:Kq76K4qaLKvZG3f%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";

async function migrateUsers() {
  console.log("Iniciando depuração da migração de Usuários (auth)...");

  const oldClient = new Client({ connectionString: OLD_DB_URL });
  const newClient = new Client({ connectionString: NEW_DB_URL });

  try {
    await oldClient.connect();
    await newClient.connect();
    await newClient.query("SET session_replication_role = 'replica';");

    const res = await oldClient.query(`SELECT * FROM "auth"."users"`);
    const users = res.rows;
    
    console.log(`Encontrados ${users.length} usuários no banco antigo.`);

    if (users.length > 0) {
      const columns = Object.keys(users[0]);
      
      // Vamos descobrir se há alguma coluna no banco antigo que não existe no novo
      // e EXCLUIR as colunas que são "GENERATED ALWAYS" (virtuais) no Supabase novo
      const newSchemaRes = await newClient.query(`
        SELECT column_name, is_generated 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'users'
      `);
      
      const newColumns = newSchemaRes.rows
        .filter(r => r.is_generated !== 'ALWAYS') // ignorar colunas geradas automaticamente (ex: confirmed_at)
        .map(r => r.column_name);
      
      const safeColumns = columns.filter(c => newColumns.includes(c));
      const columnsStr = safeColumns.map(c => `"${c}"`).join(', ');

      let successCount = 0;
      for (let i = 0; i < users.length; i++) {
        const row = users[i];
        const values = safeColumns.map(c => row[c]);
        const placeholders = safeColumns.map((_, idx) => `$${idx + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO "auth"."users" (${columnsStr}) 
          VALUES (${placeholders})
          ON CONFLICT (id) DO NOTHING
        `;

        try {
          await newClient.query(insertQuery, values);
          successCount++;
        } catch (insertErr) {
          console.error(`❌ Erro exato ao inserir usuário ${row.email}:`, insertErr.message);
        }
      }
      console.log(`✅ ${successCount} usuários migrados com sucesso para auth.users!`);
    }

    // Identidades
    const resId = await oldClient.query(`SELECT * FROM "auth"."identities"`);
    const identities = resId.rows;
    if (identities.length > 0) {
       const newSchemaRes = await newClient.query(`
        SELECT column_name, is_generated 
        FROM information_schema.columns 
        WHERE table_schema = 'auth' AND table_name = 'identities'
      `);
      
      const newColumns = newSchemaRes.rows
        .filter(r => r.is_generated !== 'ALWAYS') // ignorar colunas virtuais (ex: email em identities)
        .map(r => r.column_name);
        
      const columns = Object.keys(identities[0]);
      const safeColumns = columns.filter(c => newColumns.includes(c));
      const columnsStr = safeColumns.map(c => `"${c}"`).join(', ');

      let successCount = 0;
      for (let i = 0; i < identities.length; i++) {
        const row = identities[i];
        const values = safeColumns.map(c => row[c]);
        const placeholders = safeColumns.map((_, idx) => `$${idx + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO "auth"."identities" (${columnsStr}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await newClient.query(insertQuery, values);
          successCount++;
        } catch (insertErr) {
          console.error(`❌ Erro exato ao inserir identidade:`, insertErr.message);
        }
      }
      console.log(`✅ ${successCount} identidades migradas com sucesso para auth.identities!`);
    }

    await newClient.query("SET session_replication_role = 'origin';");

  } catch (err) {
    console.error("❌ Ocorreu um erro geral:", err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrateUsers();
