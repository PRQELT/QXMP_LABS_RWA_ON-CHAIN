/**
 * Core types for QXMP Asset Data
 */

export interface AssetData {
  asset_code: string;
  asset_name: string;
  reporting_standard: 'NI 43-101' | 'JORC' | 'GIA' | 'LBMA';
  jurisdiction: string;
  asset_value_usd: number;
  mineral_resources_mt?: number;
  gold_grade_gt?: number;
  gold_oz_in_situ?: number;
  recovery_rate?: number;
  holder: string;
  jv_structure?: {
    qxmp_labs: number;
    asset_partners: number;
  };
  report_hash: string;
  timestamp: number;
  effective_date: string;
  additional_metadata?: Record<string, any>;
}

export interface ParserConfig {
  pdfPath: string;
  assetCode: string;
  outputPath?: string;
}

export interface ParserResult {
  success: boolean;
  data?: AssetData;
  error?: string;
}

export interface NI43101Data {
  projectName: string;
  location: string;
  totalValue: number;
  mineralResources: number;
  gradeGt: number;
  ouncesInSitu: number;
  recoveryRate: number;
  effectiveDate: string;
}