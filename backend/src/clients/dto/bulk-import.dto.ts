export class BulkImportClientItemDto {
  cnpj: string;
  name: string;
  tradeName?: string;
  email?: string;
  phone?: string;
  contactName?: string;
  zipCode?: string;
  address?: string;
  neighborhood?: string;
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

  fiscal: boolean;
  contabil: boolean;
  dp: boolean;
}

export class BulkImportDto {
  tenantId: string;
  clients: BulkImportClientItemDto[];
}
