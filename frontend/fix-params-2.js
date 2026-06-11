const fs = require('fs');
const path = require('path');

const dirs = ['cadastro', 'frentes', 'colaboradores', 'alocacao', 'clientes', 'classificacao', 'entregas'];
const baseDir = 'a:/Aplicativos Vitor/consultoria_sass/frontend/src/app/(dashboard)/escritorios/[id]';

dirs.forEach(dir => {
  const filePath = path.join(baseDir, dir, 'page.tsx');
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // Check if we need to add the id variable
    if (!content.includes('const { id } = React.use(params);') && content.includes('Promise<{ id: string }>')) {
      content = content.replace(/({ params }: { params: Promise<{ id: string }> }) {/, "$1 {\n  const { id } = React.use(params);");
      fs.writeFileSync(filePath, content);
      console.log(`Fixed ${filePath}`);
    }
  }
});
