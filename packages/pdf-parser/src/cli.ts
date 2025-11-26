#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { NI43101Parser } from './extractors/ni43101';
import { AssetData } from './types';

const program = new Command();

program
  .name('qxmp-parser')
  .description('QXMP Labs PDF Parser for NI 43-101 and other mining reports')
  .version('1.0.0');

program
  .command('parse')
  .description('Parse a PDF report and extract asset data')
  .requiredOption('-f, --file <path>', 'Path to the PDF file')
  .requiredOption('-c, --code <code>', 'Asset code (e.g., QXMP:AKTA-NI43-ZA)')
  .option('-o, --output <path>', 'Output directory for JSON data', './data/assets')
  .option('-t, --type <type>', 'Report type (ni43101, jorc, gia)', 'ni43101')
  .action(async (options) => {
    try {
      console.log('🔍 QXMP Labs PDF Parser');
      console.log('========================');
      console.log(`📄 File: ${options.file}`);
      console.log(`🏷️  Asset Code: ${options.code}`);
      console.log(`📁 Output: ${options.output}`);
      console.log(`📋 Report Type: ${options.type}`);
      console.log('');

      // Verify file exists
      if (!fs.existsSync(options.file)) {
        console.error(`❌ Error: File not found: ${options.file}`);
        process.exit(1);
      }

      // Parse based on report type
      let assetData: AssetData;

      switch (options.type.toLowerCase()) {
        case 'ni43101':
          const parser = new NI43101Parser();
          console.log('⏳ Parsing NI 43-101 report...');
          assetData = await parser.parse(options.file, options.code);
          break;
        default:
          console.error(`❌ Error: Unknown report type: ${options.type}`);
          process.exit(1);
      }

      // Create output directory if it doesn't exist
      if (!fs.existsSync(options.output)) {
        fs.mkdirSync(options.output, { recursive: true });
      }

      // Generate output filename
      const safeCode = options.code.replace(/[^a-zA-Z0-9-]/g, '_');
      const outputFile = path.join(options.output, `${safeCode}.json`);

      // Write JSON output
      fs.writeFileSync(outputFile, JSON.stringify(assetData, null, 2));

      console.log('');
      console.log('✅ Parsing complete!');
      console.log('========================');
      console.log('📊 Extracted Asset Data:');
      console.log(`   Asset Code: ${assetData.asset_code}`);
      console.log(`   Asset Name: ${assetData.asset_name}`);
      console.log(`   Standard: ${assetData.reporting_standard}`);
      console.log(`   Jurisdiction: ${assetData.jurisdiction}`);
      console.log(`   Asset Value: $${assetData.asset_value_usd.toLocaleString()} USD`);
      console.log(`   Report Hash: ${assetData.report_hash.substring(0, 16)}...`);
      console.log(`   Holder: ${assetData.holder}`);
      console.log('');
      console.log(`📁 Output saved to: ${outputFile}`);

    } catch (error) {
      console.error('❌ Error parsing PDF:', error);
      process.exit(1);
    }
  });

program
  .command('verify')
  .description('Verify an existing asset JSON file')
  .requiredOption('-f, --file <path>', 'Path to the JSON file')
  .action(async (options) => {
    try {
      console.log('🔍 QXMP Labs Asset Verifier');
      console.log('===========================');
      
      // Read JSON file
      const content = fs.readFileSync(options.file, 'utf-8');
      const assetData: AssetData = JSON.parse(content);

      console.log('');
      console.log('📊 Asset Information:');
      console.log(`   Asset Code: ${assetData.asset_code}`);
      console.log(`   Asset Name: ${assetData.asset_name}`);
      console.log(`   Standard: ${assetData.reporting_standard}`);
      console.log(`   Jurisdiction: ${assetData.jurisdiction}`);
      console.log(`   Asset Value: $${assetData.asset_value_usd.toLocaleString()} USD`);
      console.log(`   Report Hash: ${assetData.report_hash}`);
      console.log(`   Timestamp: ${new Date(assetData.timestamp * 1000).toISOString()}`);
      console.log(`   Effective Date: ${assetData.effective_date}`);
      console.log(`   Holder: ${assetData.holder}`);
      
      if (assetData.jv_structure) {
        console.log(`   JV Structure: QXMP ${assetData.jv_structure.qxmp_labs * 100}% / Partners ${assetData.jv_structure.asset_partners * 100}%`);
      }

      console.log('');
      console.log('✅ Asset data is valid');

    } catch (error) {
      console.error('❌ Error verifying asset:', error);
      process.exit(1);
    }
  });

program.parse();
