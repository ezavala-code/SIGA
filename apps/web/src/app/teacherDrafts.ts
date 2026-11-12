export type GradeDrafts = {
  drafts: Record<string, string>;
  reasons: Record<string, string>;
  versions: Record<string, number>;
};

export const pendingDrafts = new Map<string, GradeDrafts>();

export function clearTeacherDrafts() {
  pendingDrafts.clear();
}

export function hasTeacherDrafts() {
  return pendingDrafts.size > 0;
}
