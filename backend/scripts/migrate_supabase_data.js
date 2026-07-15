const { Client } = require('pg');

const OLD_DB_URL = "postgresql://postgres.gxxcarfqpdmnniqfwhfa:EzzrLKYYMosiFpK3@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";
const NEW_DB_URL = "postgresql://postgres.sxutfgotljbdyzqitwhy:Kq76K4qaLKvZG3f%40@aws-1-sa-east-1.pooler.supabase.com:5432/postgres";

async function migrateData() {
  console.log("Iniciando migração de dados...");

  const oldClient = new Client({ connectionString: OLD_DB_URL });
  const newClient = new Client({ connectionString: NEW_DB_URL });

  try {
    await oldClient.connect();
    console.log("✅ Conectado ao banco ANTIGO.");
    
    await newClient.connect();
    console.log("✅ Conectado ao banco NOVO.");

    // Desabilitar chaves estrangeiras no banco novo durante a inserção
    await newClient.query("SET session_replication_role = 'replica';");
    console.log("✅ Validações de Foreign Key desativadas temporariamente.");

    // Tabelas que vamos migrar. 
    // Auth: users, identities
    const tablesToMigrate = [
      { schema: 'auth', table: 'users' },
      { schema: 'auth', table: 'identities' },
    ];

    // Buscar todas as tabelas do schema public
    const publicTablesRes = await oldClient.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    
    for (const row of publicTablesRes.rows) {
      // Ignorar tabelas do prisma (opcional, mas seguro)
      if (row.tablename !== '_prisma_migrations') {
        tablesToMigrate.push({ schema: 'public', table: row.tablename });
      }
    }

    for (const { schema, table } of tablesToMigrate) {
      console.log(`\nMigrando tabela ${schema}.${table}...`);
      
      const res = await oldClient.query(`SELECT * FROM "${schema}"."${table}"`);
      const rows = res.rows;
      
      if (rows.length === 0) {
        console.log(`Tabela ${schema}.${table} está vazia. Pulando.`);
        continue;
      }

      console.log(`Foram encontrados ${rows.length} registros. Inserindo no novo banco...`);

      // Montar a query de INSERT dinâmica
      const columns = Object.keys(rows[0]);
      const columnsStr = columns.map(c => `"${c}"`).join(', ');

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const values = columns.map(c => row[c]);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');

        const insertQuery = `
          INSERT INTO "${schema}"."${table}" (${columnsStr}) 
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        try {
          await newClient.query(insertQuery, values);
        } catch (insertErr) {
          console.error(`Erro ao inserir na tabela ${schema}.${table}:`, insertErr.message);
        }
      }
      
      console.log(`✅ Tabela ${schema}.${table} migrada com sucesso!`);
    }

    // Reativar chaves estrangeiras
    await newClient.query("SET session_replication_role = 'origin';");
    console.log("\n✅ Validações de Foreign Key reativadas.");

    console.log("🎉 Migração de dados concluída com sucesso!");

  } catch (err) {
    console.error("❌ Ocorreu um erro durante a migração:", err);
  } finally {
    await oldClient.end();
    await newClient.end();
  }
}

migrateData();
