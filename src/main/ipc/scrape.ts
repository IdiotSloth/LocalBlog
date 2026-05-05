import { ipcMain } from 'electron';
import { IPC } from '../../shared/ipc-channels';
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
}
