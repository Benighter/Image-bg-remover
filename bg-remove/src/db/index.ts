import Dexie, { Table } from 'dexie';
import { ImageHistoryItem } from '../types';

export class ImageHistoryDB extends Dexie {
  imageHistory!: Table<ImageHistoryItem, number>;

  constructor() {
    super('BGRemoverImageHistory');
    
    this.version(1).stores({
      imageHistory: '++id, originalFileName, timestamp, fileSize'
    });
  }
}

export const db = new ImageHistoryDB();
