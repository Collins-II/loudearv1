// lib/playlists/utils.ts

export function mostCommon(values: string[]) {
  if (!values.length) return null;

  const counts = values.reduce(
    (acc, value) => {
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];
}