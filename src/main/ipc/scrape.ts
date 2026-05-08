import { BrowserWindow, ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
import { ManualCollectorService, type TocEntry } from '../services/manual-collector.service';
import { WebScraperService } from '../services/web-scraper.service';

export function registerScrapeHandler(): void {
  ipcMain.handle(IPC.SCRAPE_WEBPAGE, async (_event, url: string) => {
    try {
      const result = await WebScraperService.scrape(url);
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SCRAPE_EXTRACT_TOC, async (_event, url: string) => {
    try {
      const toc = await ManualCollectorService.extractToc(url);
      return { success: true, data: toc };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.SCRAPE_COLLECT_MANUAL,
    async (_event, data: { userId: number; seriesName: string; entries: TocEntry[] }) => {
      try {
        const win = BrowserWindow.fromWebContents(_event.sender);
        const result = await ManualCollectorService.batchCollect(
          win, data.userId, data.seriesName, data.entries,
        );
        return { success: true, data: result };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );
}
