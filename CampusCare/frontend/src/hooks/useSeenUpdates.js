import { useCallback, useState } from 'react';

/**
 * Remembers (in this browser) the last status change a student has seen per
 * complaint, so the dashboard can highlight new status updates.
 * Only UI state is stored - no tokens or personal data.
 */
export function useSeenUpdates(userId) {
  const storageKey = `campuscare:seen:${userId}`;
  const [seen, setSeen] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch {
      return {};
    }
  });

  const markSeen = useCallback(
    (complaintId, changedAt) => {
      setSeen((prev) => {
        if (prev[complaintId] === changedAt) return prev;
        const next = { ...prev, [complaintId]: changedAt };
        try {
          localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* storage blocked or full - keep the in-memory state only */
        }
        return next;
      });
    },
    [storageKey],
  );

  /** A complaint has an unseen update if its status changed after submission and after the last view. */
  const hasUpdate = useCallback(
    (c) => {
      const changed = c.lastStatusChangeAt || c.createdAt;
      if (changed === c.createdAt) return false;
      return !seen[c.complaintId] || seen[c.complaintId] < changed;
    },
    [seen],
  );

  return { hasUpdate, markSeen };
}
