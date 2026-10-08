/**
 * Real-time event synchronization utility for Mittsure CRM.
 * Keeps Dashboard, Route Planner, Field Mode, and School Directory
 * synchronized across all components and browser tabs in real-time.
 */

export type SyncEntity = 'visit' | 'route' | 'school' | 'settings' | 'followup' | 'all';

export function notifyDataChange(entity: SyncEntity, detail?: any) {
  if (typeof window === 'undefined') return;
  const timestamp = Date.now();
  window.dispatchEvent(
    new CustomEvent('mittsure:sync', {
      detail: { entity, detail, timestamp },
    })
  );
  try {
    localStorage.setItem(
      'mittsure:last_sync',
      JSON.stringify({ entity, timestamp })
    );
  } catch {}
}

export function subscribeToDataChanges(callback: (entity: SyncEntity) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail?.entity || 'school');
  };

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === 'mittsure:last_sync' && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        callback(parsed.entity || 'school');
      } catch {
        callback('school');
      }
    }
  };

  window.addEventListener('mittsure:sync', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener('mittsure:sync', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}
