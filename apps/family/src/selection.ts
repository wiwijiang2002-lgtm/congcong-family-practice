/** Add an explicit 1-based range from the visible list, without exceeding the plan cap. */
export function addRangeSelection(
  current: number[],
  visible: number[],
  start: number,
  end: number,
  max = 12,
): { ids: number[]; added: number; error: string | null } {
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end > visible.length) {
    return { ids: [...current], added: 0, error: `请输入有效范围：第 1 到第 ${visible.length} 道。` };
  }
  const range = visible.slice(start - 1, end);
  const selected = new Set(current);
  const additions = range.filter(id => !selected.has(id));
  if (current.length + additions.length > max) {
    return { ids: [...current], added: 0, error: `这段有 ${additions.length} 道未选，已选 ${current.length} 道，会超过每份 ${max} 道；请缩小范围或先清空。` };
  }
  return { ids: [...current, ...additions], added: additions.length, error: null };
}
