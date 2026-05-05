import fs from 'node:fs';
import path from 'node:path';
import { shell } from 'electron';
import ExcelJS from 'exceljs';
import mammoth from 'mammoth';
import type { KnowledgeFile } from '../../shared/types';
import { dbGet } from '../db';

export class PreviewService {
  /** Generate an HTML preview for a knowledge base file */
  static async generatePreview(fileId: number): Promise<{ html?: string; error?: string; fileType?: string }> {
    const row = await dbGet<KnowledgeFile & { file_path: string; filename: string }>('SELECT * FROM knowledge_files WHERE id = ?', [fileId]);
    if (!row) return { error: '文件不存在' };

    const filePath = row.file_path || row.filePath;
    if (!fs.existsSync(filePath)) return { error: '文件不存在于磁盘' };

    const ext = path.extname(row.filename || filePath).toLowerCase();

    try {
      switch (ext) {
        case '.docx':
        case '.doc':
          return await this.previewDocx(filePath);
        case '.xlsx':
        case '.xls':
          return await this.previewXlsx(filePath);
        case '.pdf':
          return await this.previewPdf(filePath);
        case '.txt':
        case '.md':
          return this.previewText(filePath);
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.webp':
        case '.svg':
          return this.previewImage(filePath);
        case '.pptx':
        case '.ppt':
          return { error: 'PPT 预览暂不支持，请使用系统程序打开', fileType: ext };
        default:
          return { error: '不支持的文件格式', fileType: ext };
      }
    } catch (err) {
      return { error: `预览失败: ${(err as Error).message}` };
    }
  }

  /** Open a file with the OS default application */
  static async openExternal(filePath: string): Promise<void> {
    await shell.openPath(filePath);
  }

  // ---- Internal converters ----

  private static async previewDocx(filePath: string): Promise<{ html?: string; error?: string }> {
    const buffer = fs.readFileSync(filePath);
    const result = await mammoth.convertToHtml({ buffer });
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #333; }
        h1,h2,h3 { color: #1f4e79; }
        table { border-collapse: collapse; width: 100%; }
        td,th { border: 1px solid #ddd; padding: 8px; }
        img { max-width: 100%; }
      </style></head><body>${result.value}</body></html>`,
    };
  }

  private static async previewXlsx(filePath: string): Promise<{ html?: string; error?: string }> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheets = workbook.worksheets.map((sheet) => {
      let tableHtml = `<h3>${sheet.name}</h3><table>`;
      sheet.eachRow((row) => {
        tableHtml += '<tr>';
        row.eachCell((cell) => {
          const val = cell.value?.toString() || '';
          tableHtml += `<td>${val}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</table>';
      return tableHtml;
    });

    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; }
        h3 { color: #1f4e79; margin-top: 20px; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 13px; }
        td,th { border: 1px solid #ddd; padding: 6px 10px; }
        tr:nth-child(even) { background: #f9f9f9; }
      </style></head><body>${sheets.join('')}</body></html>`,
    };
  }

  private static async previewPdf(filePath: string): Promise<{ html?: string; error?: string }> {
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      if (typeof pdfjsLib.getDocument !== 'function') {
        return { error: 'PDF 预览组件加载失败，请使用系统程序打开' };
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';

      const data = new Uint8Array(fs.readFileSync(filePath));
      const doc = await pdfjsLib.getDocument({ data }).promise;
      const totalPages = doc.numPages;
      const pages: string[] = [];

      for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        let textHtml = '';
        for (const item of textContent.items) {
          if ('str' in item) {
            textHtml += `${item.str} `;
          }
        }
        pages.push(
          `<div class="pdf-page"><div class="page-num">第 ${i}/${totalPages} 页</div><p class="pdf-text">${textHtml}</p></div>`,
        );
      }

      const morePages =
        totalPages > 5 ? `<p class="more">仅显示前 5 页 (共 ${totalPages} 页)。使用系统程序打开查看完整内容。</p>` : '';

      return {
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; color: #333; }
          .pdf-page { margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 4px; background: #fafafa; }
          .page-num { font-size: 12px; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
          .pdf-text { line-height: 1.8; white-space: pre-wrap; font-size: 14px; }
          .more { color: #999; font-style: italic; margin-top: 15px; }
        </style></head><body>${pages.join('')}${morePages}</body></html>`,
      };
    } catch (err) {
      return { error: `PDF 预览失败: ${(err as Error).message}` };
    }
  }

  private static previewText(filePath: string): { html?: string } {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const escaped = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Consolas", "Courier New", monospace; padding: 20px; line-height: 1.6; white-space: pre-wrap; color: #333; background: #fafafa; }
      </style></head><body>${escaped}</body></html>`,
    };
  }

  private static previewImage(filePath: string): { html?: string; fileType?: string } {
    // Use file:// protocol for local images (works in Electron)
    const encodedPath = filePath.replace(/\\/g, '/');
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style></head><body><img src="file:///${encodedPath}" onerror="this.parentElement.innerHTML='<p style=color:#999>图片加载失败</p>'" /></body></html>`,
    };
  }
}
