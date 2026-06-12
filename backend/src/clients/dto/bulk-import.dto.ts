export class BulkImportClientItemDto {
  name: string;
  tradeName?: string;
  cnpj?: string;
  city?: string;
  state?: string;
  taxRegime?: string;
  segment?: string;
  revenueBracket?: string;
  hasEconomicGroup?: boolean;
  economicGroupName?: string;
  monthlyFee?: number;
  classification?: string;
  status?: string;
  observations?: string;

  fiscal: boolean;
  contabil: boolean;
  dp: boolean;

  // Fiscal
  fiscalLeaderName?: string;
  fiscalOp1Name?: string;
  fiscalOp2Name?: string;
  fiscalFrequency?: string;
  fiscalComplexity?: number;
  fiscalNotesVolume?: string;
  fiscalOutNotesVolume?: string;
  fiscalInNotesVolume?: string;
  fiscalAutomationLevel?: string;
  fiscalHasSpecialRegime?: boolean;
  fiscalSpecialRegimeDesc?: string;
  fiscalInNfe?: string;
  fiscalOutNfe?: string;
  fiscalNfse?: string;
  fiscalSendingChannels?: string;
  fiscalSystem?: string;
  fiscalNotesPlatform?: string;
  fiscalMeetsDeadlines?: string;
  fiscalParticulars?: string;

  // DP
  dpLeaderName?: string;
  dpOp1Name?: string;
  dpOp2Name?: string;
  dpFrequency?: string;
  dpComplexity?: number;
  dpEmployeesCount?: number;
  dpProlaboreCount?: number;
  dpDomesticsCount?: number;
  dpPointReceipt?: string;
  dpVariablesLaunch?: string;
  dpProcessingType?: string;
  dpSheetSending?: string;
  dpFrequentAdmissions?: boolean;
  dpParticulars?: string;

  // Contábil
  contabilLeaderName?: string;
  contabilOp1Name?: string;
  contabilOp2Name?: string;
  contabilFrequency?: string;
  contabilComplexity?: number;
  contabilBookkeepingRegime?: string;
  contabilLastClosing?: string;
  contabilClosingPeriod?: string;
  contabilInfoReceiptFreq?: string;
  contabilInfoReceiptMethod?: string;
  contabilIntegrationLevel?: string;
  contabilTrialBalanceNeed?: string;
  contabilLaunchesVolume?: string;
  contabilParticulars?: string;
}

export class BulkImportDto {
  tenantId: string;
  clients: BulkImportClientItemDto[];
}
