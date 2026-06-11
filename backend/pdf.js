const puppeteer = require('puppeteer-core');

(async () => {
  try {
    console.log("Iniciando browser...");
    const browser = await puppeteer.launch({
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: "new"
    });
    
    console.log("Criando nova página...");
    const page = await browser.newPage();
    
    console.log("Navegando para o HTML...");
    await page.goto('file:///A:/Aplicativos Vitor/consultoria_sass/temp_styled.html', {
      waitUntil: 'networkidle0'
    });
    
    console.log("Gerando PDF...");
    await page.pdf({
      path: 'A:\\Aplicativos Vitor\\consultoria_sass\\docs_cliente\\Relatorio_Implementacao_Sevilha.pdf',
      format: 'A4',
      printBackground: true,
      margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    
    console.log("Fechando browser...");
    await browser.close();
    console.log("Sucesso!");
  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
  }
})();
