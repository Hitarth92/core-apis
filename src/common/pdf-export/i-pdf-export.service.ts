import { PdfDocument } from './domain';
import { PdfOptions } from './domain';

export const PDF_EXPORT_SERVICE = 'IPdfExportService';

export interface IPdfExportService {
  generateFromHtmlAsync(html: string, filename: string, options?: PdfOptions): Promise<PdfDocument>;
  generateFromTemplateAsync(
    templateName: string,
    context: Record<string, unknown>,
    filename: string,
    options?: PdfOptions,
  ): Promise<PdfDocument>;
}
