import type {
  MemoryItem,
} from "./persona.types.js";

export function rankMemories(
  memories: MemoryItem[],
): MemoryItem[] {
  const priority = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return [...memories].sort(
    (a, b) =>
      priority[b.importance] -
      priority[a.importance],
  );
}

export function selectMemories(
  memories: MemoryItem[],
  maxItems = 20,
): MemoryItem[] {
  if (maxItems <= 0) {
    return [];
  }

  return rankMemories(memories)
    .slice(0, maxItems);
}

export function formatMemoryContext(
  memories: MemoryItem[],
): string {
  const selected =
    selectMemories(memories);

  if (selected.length === 0) {
    return "No saved user memory is available.";
  }

  return selected
    .map(
      (memory) =>
        `- ${memory.fact}`,
    )
    .join("\n");
}
