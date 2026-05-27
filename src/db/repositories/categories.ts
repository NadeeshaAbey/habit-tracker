import { getDB } from '../client';
import type { Category } from '@/types';

export async function listCategories(): Promise<Category[]> {
  const db = await getDB();
  const rows = await db.getAllAsync<any>(
    `SELECT id, name, color, created_at FROM categories ORDER BY created_at ASC`
  );
  return rows.map(r => ({
    id: r.id,
    name: r.name,
    color: r.color,
    createdAt: r.created_at,
  }));
}

export async function addCategory(name: string, color: string): Promise<number> {
  const db = await getDB();
  const result = await db.runAsync(
    `INSERT INTO categories (name, color, created_at) VALUES (?, ?, ?)`,
    [name, color, Date.now()]
  );
  return result.lastInsertRowId;
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDB();
  await db.runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
}
