type Item = { id: string; created_at: string };

// Junta sem duplicar (um item pode chegar pela busca, pelo insert e pelo realtime) e deixa o mais novo primeiro.
export function mergeById<T extends Item>(current: T[], incoming: T[]): T[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}
