const fs = require('fs');
const path = require('path');

const dirs = ['cadastro', 'frentes', 'colaboradores', 'alocacao', 'clientes', 'classificacao', 'entregas'];
const baseDir = 'a:/Aplicativos Vitor/consultoria_sass/frontend/src/app/(dashboard)/escritorios/[id]';

dirs.forEach(dir => {
  const filePath = path.join(baseDir, dir, 'page.tsx');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    content = content.replace(/params: { id: string }/g, 'params: Promise<{ id: string }>');
    
    // Check if React is already imported
    if (!content.includes("import React ")) {
      content = content.replace(/'use client';\n/g, "'use client';\n\nimport React from 'react';\n");
    }
    
    // Add React.use(params)
    content = content.replace(/({ params }: { params: Promise<{ id: string }> }) {\n/g, "$1 {\n  const { id } = React.use(params);\n");
    
    // Replace params.id with id
    content = content.replace(/params\.id/g, 'id');
    
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
  }
});
