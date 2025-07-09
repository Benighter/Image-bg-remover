import Dexie, { Table } from 'dexie';
import type { ImageFile } from '../App';

export class ImageDatabase extends Dexie {
  images!: Table<ImageFile>;

  constructor() {
    super('BGRemoverDB');
    this.version(1).stores({
      images: '++id, name, timestamp, originalFile, processedFile, processedUrl'
    });
  }
}

export const db = new ImageDatabase();
