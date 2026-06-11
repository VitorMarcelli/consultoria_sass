const fs = require('fs');
const html = fs.readFileSync('a:\\Aplicativos Vitor\\consultoria_sass\\temp.html', 'utf8');
const style = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; max-width: 800px; margin: auto; color: #1f2937; line-height: 1.6; }
  h1 { color: #1e3a8a; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px; }
  h2 { color: #2563eb; margin-top: 30px; }
  h3 { color: #3b82f6; }
  ul { padding-left: 20px; }
  li { margin-bottom: 8px; }
  blockquote { border-left: 4px solid #3b82f6; padding: 10px 20px; background: #f3f4f6; color: #4b5563; margin: 20px 0; }
</style>
</head>
<body>
`;
fs.writeFileSync('a:\\Aplicativos Vitor\\consultoria_sass\\temp_styled.html', style + html + '</body></html>');
