export class BulkImportClientItemDto {
  cnpj: string;
  name: string;
  fiscal: boolean;
  contabil: boolean;
  dp: boolean;
}

export class BulkImportDto {
  tenantId: string;
  clients: BulkImportClientItemDto[];
}
