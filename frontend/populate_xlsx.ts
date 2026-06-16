const XLSX = require('xlsx');

const workbook = XLSX.readFile('../docs_cliente/modelo_importacao_completo (1).xlsx');
const sheetName = workbook.SheetNames[0];

const clients = [
  {
    'Razão Social': 'Tech Inovações LTDA',
    'Nome Fantasia': 'Tech Inova',
    'CNPJ': '11.222.333/0001-44',
    'Regime Tributário': 'Lucro Presumido',
    'Segmento': 'Tecnologia',
    'Faixa de Faturamento': '1M - 5M',
    'Honorários': 'R$ 2500,00',
    'Classificação': 'B',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Líder responsável': 'Vitor',
    'Fiscal - Complexidade': 2,
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'NÃO'
  },
  {
    'Razão Social': 'Padaria Pão Quente SA',
    'Nome Fantasia': 'Pão Quente',
    'CNPJ': '22.333.444/0001-55',
    'Regime Tributário': 'Simples Nacional',
    'Segmento': 'Alimentação',
    'Honorários': 'R$ 1200,00',
    'Classificação': 'C',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Complexidade': 1,
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'SIM',
    'DP - Líder responsável': 'Vitor',
    'DP - Complexidade': 2
  },
  {
    'Razão Social': 'Construtora Edificar Engenharia',
    'Nome Fantasia': 'Edificar',
    'CNPJ': '33.444.555/0001-66',
    'Regime Tributário': 'Lucro Real',
    'Segmento': 'Construção',
    'Honorários': 'R$ 8500,00',
    'Classificação': 'A',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Complexidade': 3,
    'Possui Frente Contábil?': 'SIM',
    'Contábil - Líder responsável': 'Vitor',
    'Contábil - Complexidade': 3,
    'Possui Frente DP?': 'SIM',
    'DP - Complexidade': 3
  },
  {
    'Razão Social': 'Consultoria Alfa',
    'Nome Fantasia': 'Alfa',
    'CNPJ': '44.555.666/0001-77',
    'Regime Tributário': 'Lucro Presumido',
    'Segmento': 'Serviços',
    'Honorários': 'R$ 3000,00',
    'Classificação': 'B',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'NÃO',
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'SIM'
  },
  {
    'Razão Social': 'Comercial Varejo 123',
    'Nome Fantasia': 'Varejo 123',
    'CNPJ': '55.666.777/0001-88',
    'Regime Tributário': 'Simples Nacional',
    'Segmento': 'Comércio',
    'Honorários': 'R$ 1500,00',
    'Classificação': 'C',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Complexidade': 2,
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'NÃO'
  },
  {
    'Razão Social': 'Clínica Médica Saúde Total',
    'Nome Fantasia': 'Saúde Total',
    'CNPJ': '66.777.888/0001-99',
    'Regime Tributário': 'Lucro Presumido',
    'Segmento': 'Saúde',
    'Honorários': 'R$ 4200,00',
    'Classificação': 'A',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Líder responsável': 'Vitor',
    'Fiscal - Complexidade': 1,
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'SIM',
    'DP - Complexidade': 2
  },
  {
    'Razão Social': 'Transportadora Rápido e Certo',
    'Nome Fantasia': 'Rápido Transporte',
    'CNPJ': '77.888.999/0001-00',
    'Regime Tributário': 'Lucro Real',
    'Segmento': 'Logística',
    'Honorários': 'R$ 6800,00',
    'Classificação': 'A',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Complexidade': 3,
    'Possui Frente Contábil?': 'SIM',
    'Contábil - Complexidade': 3,
    'Possui Frente DP?': 'SIM'
  },
  {
    'Razão Social': 'Escola Aprender',
    'Nome Fantasia': 'Aprender',
    'CNPJ': '88.999.000/0001-11',
    'Regime Tributário': 'Simples Nacional',
    'Segmento': 'Educação',
    'Honorários': 'R$ 2100,00',
    'Classificação': 'B',
    'Status': 'ACTIVE',
    'Possui Frente Fiscal?': 'SIM',
    'Fiscal - Complexidade': 1,
    'Possui Frente Contábil?': 'SIM',
    'Possui Frente DP?': 'SIM'
  }
];

const newSheet = XLSX.utils.json_to_sheet(clients);
const newWorkbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(newWorkbook, newSheet, sheetName);

XLSX.writeFile(newWorkbook, '../docs_cliente/clientes_para_teste_importacao.xlsx');
console.log("Arquivo clientes_para_teste_importacao.xlsx criado com sucesso!");
