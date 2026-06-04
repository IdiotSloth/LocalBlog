import fs from 'node:fs';
import path from 'node:path';
import { shell } from 'electron';
import { dbGet } from '../db';

/** Wrap a promise with a timeout; on timeout return partial result with note */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | { error: string }> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`${label} 解析超时 (${ms / 1000}s)`)), ms),
  );
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    return { error: (err as Error).message };
  }
}

export class PreviewService {
  /** Generate an HTML preview for a knowledge base file */
  static async generatePreview(fileId: number, userId?: number): Promise<{ html?: string; error?: string; fileType?: string }> {
    const row = await dbGet<{ file_path: string; filename: string; file_type: string }>(
      userId
        ? 'SELECT * FROM knowledge_files WHERE id = ? AND user_id = ?'
        : 'SELECT * FROM knowledge_files WHERE id = ?',
      userId ? [fileId, userId] : [fileId],
    );
    if (!row) return { error: '文件不存在' };

    const filePath = row.file_path;
    if (!fs.existsSync(filePath)) return { error: '文件不存在于磁盘' };

    const ext = path.extname(row.filename || filePath).toLowerCase();

    try {
      switch (ext) {
        case '.docx':
        case '.doc':
          return (await withTimeout(PreviewService.previewDocx(filePath), 30000, 'DOCX')) as { html?: string; error?: string };
        case '.xlsx':
        case '.xls':
          return (await withTimeout(PreviewService.previewXlsx(filePath), 30000, 'XLSX')) as { html?: string; error?: string };
        case '.csv':
          return PreviewService.previewCsv(filePath);
        case '.pdf':
          return (await withTimeout(PreviewService.previewPdf(filePath), 30000, 'PDF')) as { html?: string; error?: string };
        case '.txt':
          return PreviewService.previewText(filePath);
        case '.md':
          return await PreviewService.previewMarkdown(filePath);
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.gif':
        case '.webp':
        case '.svg':
        case '.bmp':
          return PreviewService.previewImage(filePath);
        case '.mp4':
        case '.webm':
        case '.mov':
          return PreviewService.previewMedia(filePath, 'video');
        case '.mp3':
        case '.wav':
        case '.ogg':
          return PreviewService.previewMedia(filePath, 'audio');
        case '.pptx':
        case '.ppt':
          return { error: 'PPT 预览暂不支持，请点击"外部打开"使用系统程序查看', fileType: ext };
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

  // ---- Shared interactive table helpers (T2112) ----

  private static escHtml(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /** Reusable sort+filter JS for XLSX/CSV table previews */
  private static sortFilterJS(): string {
    return `
      function filterTable(tableId, query) {
        const rows = document.getElementById(tableId).querySelectorAll('tbody tr');
        const q = query.toLowerCase();
        rows.forEach(r => { r.style.display = q ? (r.textContent.toLowerCase().includes(q) ? '' : 'none') : ''; });
      }
      function sortTable(tableId, colIdx) {
        const table = document.getElementById(tableId);
        const tbody = table.querySelector('tbody');
        const rows = Array.from(tbody.querySelectorAll('tr'));
        const arrows = table.querySelectorAll('.sort-arrow');
        arrows.forEach(a => a.textContent = '');
        const arrow = table.querySelectorAll('th')[colIdx].querySelector('.sort-arrow');
        const asc = table.dataset.sortDir !== 'asc';
        rows.sort((a, b) => {
          const va = a.children[colIdx]?.textContent || '';
          const vb = b.children[colIdx]?.textContent || '';
          const na = parseFloat(va), nb = parseFloat(vb);
          if (!isNaN(na) && !isNaN(nb)) return asc ? na - nb : nb - na;
          return asc ? va.localeCompare(vb, 'zh-CN') : vb.localeCompare(va, 'zh-CN');
        });
        rows.forEach(r => tbody.appendChild(r));
        arrow.textContent = asc ? ' ▲' : ' ▼';
        table.dataset.sortDir = asc ? 'asc' : 'desc';
      }`;
  }

  // ---- Internal converters ----

  private static async previewDocx(filePath: string): Promise<{ html?: string; error?: string }> {
    const buffer = fs.readFileSync(filePath);
    const mammoth = await import('mammoth');
    const result = await mammoth.convertToHtml({
      buffer,
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
      ],
    });
    // R279: Strip script/event-handlers from mammoth output before injecting into HTML
    const sanitized = result.value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
      .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 24px; line-height: 1.9; max-width: 820px; margin: 0 auto; color: #2c2c2c; }
        h1 { font-size: 26px; color: #1a3a5c; border-bottom: 2px solid #e0e0e0; padding-bottom: 8px; margin-top: 28px; }
        h2 { font-size: 20px; color: #1f4e79; margin-top: 22px; }
        h3 { font-size: 17px; color: #2c5f8a; margin-top: 18px; }
        p { margin: 10px 0; }
        table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 13px; }
        td,th { border: 1px solid #d0d0d0; padding: 8px 12px; text-align: left; }
        th { background: #f0f4f8; font-weight: 600; }
        img { max-width: 100%; height: auto; border-radius: 4px; margin: 12px 0; }
        blockquote { border-left: 3px solid #1f4e79; padding: 4px 16px; margin: 16px 0; color: #555; background: #f8fafc; }
        ul,ol { padding-left: 24px; } li { margin: 4px 0; }
      </style></head><body>${sanitized}</body></html>`,
    };
  }

  private static async previewXlsx(filePath: string): Promise<{ html?: string; error?: string }> {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    const sheetTabs: string[] = [];
    const sheetContents: string[] = [];
    workbook.worksheets.forEach((sheet, idx) => {
      const sheetId = `sheet-${idx}`;
      const safeName = PreviewService.escHtml(sheet.name);
      sheetTabs.push(
        `<button class="sheet-tab${idx === 0 ? ' active' : ''}" onclick="switchSheet('${sheetId}', this)">${safeName}</button>`,
      );
      let tableHtml = `<div class="sheet-content" id="${sheetId}" style="display:${idx === 0 ? 'block' : 'none'}">`;
      tableHtml += `<div class="sheet-search"><input type="text" placeholder="过滤 ${safeName}..." oninput="filterTable('${sheetId}-table', this.value)" /></div>`;
      tableHtml += `<div class="table-wrap"><table id="${sheetId}-table"><thead><tr>`;

      // First row as header
      const firstRow = sheet.getRow(1);
      firstRow.eachCell((cell) => {
        const val = PreviewService.escHtml(cell.value?.toString() || '');
        tableHtml += `<th onclick="sortTable('${sheetId}-table', this.cellIndex)">${val} <span class="sort-arrow"></span></th>`;
      });
      tableHtml += '</tr></thead><tbody>';

      sheet.eachRow((row, rowNum) => {
        if (rowNum === 1) return; // skip header
        tableHtml += '<tr>';
        row.eachCell((cell) => {
          const val = PreviewService.escHtml(cell.value?.toString() || '');
          tableHtml += `<td>${val || '&nbsp;'}</td>`;
        });
        tableHtml += '</tr>';
      });
      tableHtml += '</tbody></table></div></div>';
      sheetContents.push(tableHtml);
    });

    const sheetSwitchJS = `
      function switchSheet(id, btn) {
        document.querySelectorAll('.sheet-content').forEach(s => s.style.display = 'none');
        document.querySelectorAll('.sheet-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(id).style.display = 'block';
        btn.classList.add('active');
      }`;

    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; background: #fafafa; }
        .sheet-tabs { display: flex; gap: 2px; margin-bottom: 12px; flex-wrap: wrap; }
        .sheet-tab { padding: 6px 16px; border: 1px solid #d0d0d0; border-bottom: none; border-radius: 6px 6px 0 0; background: #eee; cursor: pointer; font-size: 13px; transition: background 0.15s; }
        .sheet-tab.active { background: #fff; font-weight: 600; color: #1f4e79; }
        .sheet-tab:hover { background: #e0e0e0; }
        .sheet-search { margin-bottom: 8px; }
        .sheet-search input { width: 100%; max-width: 300px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
        .sheet-search input:focus { border-color: #1f4e79; }
        .table-wrap { overflow-x: auto; border-radius: 6px; border: 1px solid #e0e0e0; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; background: #fff; }
        th { background: #f0f4f8; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #d0d0d0; cursor: pointer; white-space: nowrap; user-select: none; }
        th:hover { background: #e0e8f0; }
        td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; }
        tr:nth-child(even) td { background: #fafbfc; }
        tr:hover td { background: #f0f4f8; }
        .sort-arrow { font-size: 10px; color: #999; }
      </style></head><body>
        <div class="sheet-tabs">${sheetTabs.join('')}</div>
        ${sheetContents.join('')}
        <script>${sheetSwitchJS}${PreviewService.sortFilterJS()}</script>
      </body></html>`,
    };
  }

  /** T2112: CSV preview with sortable/filterable table (reuses XLSX table UI) */
  private static previewCsv(filePath: string): { html?: string } {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return { html: '<p>CSV 文件为空</p>' };

    const rows = lines.map((line) => {
      // Simple CSV parse (handles quoted fields)
      const cells: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const ch of line) {
        if (ch === '"') { inQuotes = !inQuotes; continue; }
        if (ch === ',' && !inQuotes) { cells.push(current); current = ''; continue; }
        current += ch;
      }
      cells.push(current);
      return cells;
    });

    if (rows.length === 0) return { html: '<p>CSV 解析失败</p>' };

    const maxCols = Math.min(Math.max(...rows.map((r) => r.length)), 50);
    const maxRows = Math.min(rows.length, 200);
    const moreRows = rows.length > 200 ? `<p class="more">显示前 200 行 (共 ${rows.length} 行)</p>` : '';

    // Build table
    let tableHtml = '<table><thead><tr>';
    for (let c = 0; c < maxCols; c++) {
      const headerVal = PreviewService.escHtml(rows[0]?.[c] || `列${c + 1}`);
      tableHtml += `<th onclick="sortTable('csvTable', ${c})">${headerVal}<span class="sort-arrow"></span></th>`;
    }
    tableHtml += '</tr></thead><tbody>';
    for (let r = 1; r < maxRows; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < maxCols; c++) {
        const val = (rows[r]?.[c] || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        tableHtml += `<td>${val || '&nbsp;'}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody></table>';

    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; }
        .search-bar { margin-bottom: 12px; }
        .search-bar input { width: 100%; max-width: 300px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
        .search-bar input:focus { border-color: #1f4e79; }
        .table-wrap { overflow-x: auto; border-radius: 6px; border: 1px solid #e0e0e0; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; background: #fff; }
        th { background: #f0f4f8; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #d0d0d0; cursor: pointer; white-space: nowrap; user-select: none; }
        th:hover { background: #e0e8f0; }
        td { padding: 6px 12px; border-bottom: 1px solid #f0f0f0; white-space: nowrap; }
        tr:nth-child(even) td { background: #fafbfc; }
        tr:hover td { background: #f0f4f8; }
        .sort-arrow { font-size: 10px; color: #999; }
        .more { color: #999; font-style: italic; margin-top: 12px; }
      </style></head><body>
        <div class="search-bar"><input type="text" placeholder="过滤行..." oninput="filterTable('csvTable', this.value)" /></div>
        <div class="table-wrap">${tableHtml}</div>
        ${moreRows}
        <script>${PreviewService.sortFilterJS()}</script>
      </body></html>`,
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
            textHtml += `${PreviewService.escHtml(item.str)} `;
          }
        }
        pages.push(
          `<div class="pdf-page"><div class="page-num">第 ${i}/${totalPages} 页</div><p class="pdf-text">${textHtml}</p></div>`,
        );
      }

      const morePages =
        totalPages > 5 ? `<p class="more" id="moreHint">仅显示前 5 页 (共 ${totalPages} 页)。使用系统程序打开查看完整内容。</p>` : '';

      return {
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body { font-family: "Microsoft YaHei", sans-serif; padding: 16px; color: #333; background: #fafafa; }
          .search-bar { margin-bottom: 16px; display: flex; gap: 8px; align-items: center; }
          .search-bar input { flex: 1; max-width: 400px; padding: 6px 10px; border: 1px solid #d0d0d0; border-radius: 4px; font-size: 13px; outline: none; }
          .search-bar input:focus { border-color: #1f4e79; }
          .search-bar .count { font-size: 12px; color: #999; }
          .pdf-page { margin-bottom: 16px; padding: 14px; border: 1px solid #e0e0e0; border-radius: 6px; background: #fff; }
          .page-num { font-size: 12px; color: #999; margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 6px; font-weight: 600; }
          .pdf-text { line-height: 1.9; white-space: pre-wrap; font-size: 14px; }
          .pdf-text mark { background: #fff3b0; padding: 0 2px; border-radius: 2px; }
          .more { color: #999; font-style: italic; margin-top: 12px; }
          .no-match { color: #999; text-align: center; padding: 20px; }
        </style></head><body>
          <div class="search-bar"><input type="text" id="searchInput" placeholder="搜索 PDF 文本... (前5页)" oninput="searchPdf(this.value)" /><span class="count" id="matchCount"></span></div>
          ${pages.join('')}${morePages}
          <script>
            function searchPdf(query) {
              const q = query.toLowerCase().trim();
              const pages = document.querySelectorAll('.pdf-text');
              let total = 0;
              pages.forEach(p => {
                const orig = p.dataset.orig || p.textContent;
                if (!p.dataset.orig) p.dataset.orig = orig;
                if (!q) { p.innerHTML = orig; return; }
                const idx = orig.toLowerCase().indexOf(q);
                if (idx === -1) { p.innerHTML = orig; return; }
                let html = '';
                let last = 0;
                let haystack = orig.toLowerCase();
                let pos = haystack.indexOf(q);
                while (pos !== -1) {
                  total++;
                  html += orig.slice(last, pos).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '<mark>' + orig.slice(pos, pos + q.length).replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</mark>';
                  last = pos + q.length;
                  pos = haystack.indexOf(q, last);
                }
                html += orig.slice(last).replace(/</g,'&lt;').replace(/>/g,'&gt;');
                p.innerHTML = html;
              });
              document.getElementById('matchCount').textContent = q ? (total + ' 处匹配') : '';
            }
          </script>
        </body></html>`,
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
    const encodedPath = filePath.replace(/\\/g, '/');
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f0f0f0; }
        img { max-width: 100%; max-height: 100vh; object-fit: contain; }
      </style></head><body><img src="file:///${encodedPath}" onerror="this.parentElement.innerHTML='<p style=color:#999>图片加载失败</p>'" /></body></html>`,
    };
  }

  private static async previewMarkdown(filePath: string): Promise<{ html?: string }> {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const MarkdownIt = (await import('markdown-it')).default;
    const md = new MarkdownIt({ html: false, linkify: true, typographer: true });
    const bodyHtml = md.render(raw);
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { font-family: "Microsoft YaHei", sans-serif; padding: 20px; line-height: 1.8; max-width: 800px; margin: 0 auto; color: #333; }
        h1,h2,h3 { color: #1f4e79; }
        pre { background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 13px; }
        code { font-family: "Consolas", "Courier New", monospace; font-size: 13px; }
        table { border-collapse: collapse; width: 100%; }
        td,th { border: 1px solid #ddd; padding: 8px; }
        img { max-width: 100%; }
        blockquote { border-left: 3px solid #ccc; margin-left: 0; padding-left: 16px; color: #666; }
      </style></head><body>${bodyHtml}</body></html>`,
    };
  }

  private static previewMedia(filePath: string, type: 'video' | 'audio'): { html?: string } {
    const encodedPath = filePath.replace(/\\/g, '/');
    const tag = type === 'video' ? 'video' : 'audio';
    return {
      html: `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body { margin: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #000; }
        ${tag} { max-width: 100%; max-height: 100vh; outline: none; }
      </style></head><body><${tag} src="file:///${encodedPath}" controls autoplay style="max-width:100%;max-height:100vh">
        您的浏览器不支持此媒体格式
      </${tag}></body></html>`,
    };
  }

  /** Check if file is large — export for renderer to decide on loading UX */
  static getFileSize(filePath: string): number {
    try { return fs.statSync(filePath).size; } catch { return 0; }
  }
}
