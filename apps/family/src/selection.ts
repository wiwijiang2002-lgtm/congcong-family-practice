/** Add visible question ids to a selection without duplicates or exceeding the plan cap. */
export function addVisibleSelection(
  current: number[],
  visible: number[],
  max = 12,
): { ids: number[]; added: number; skipped: number; full: boolean } {
  const ids = [...current];
  let added = 0, skipped = 0;
  for (const id of visible) {
    if (ids.includes(id)) continue;
    if (ids.length >= max) { skipped++; continue; }
    ids.push(id);
    added++;
  }
  return { ids, added, skipped, full: ids.length >= max };
}
