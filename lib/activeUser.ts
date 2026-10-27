export interface ActiveUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  baseLocation: string;
  baseLat: number;
  baseLng: number;
  targetDistrict: string; // 'Mysuru' | 'Mandya' | 'Chamarajanagar' | 'Hassan' | 'Kodagu' | 'ALL'
  dailyGoal: number;
  isDefaultLead: boolean;
  uploadedPdfName?: string;
  uploadedSchoolIds?: string[];
  lastActive: string;
}

export const DEFAULT_LEAD_USER: ActiveUser = {
  id: 'KA-REP-01',
  name: 'Nichhenametla Kalyan Ashrith',
  phone: '+91 94939 65636',
  email: 'kalyan.ashrith@mittsure.com',
  baseLocation: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
  baseLat: 12.3021,
  baseLng: 76.6178,
  targetDistrict: 'Mysuru',
  dailyGoal: 7,
  isDefaultLead: true,
  lastActive: new Date().toISOString(),
};

const STORAGE_KEY = 'mittsure_active_user_session';

export function getActiveUser(): ActiveUser {
  if (typeof window === 'undefined') {
    return DEFAULT_LEAD_USER;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error reading active user from localStorage:', e);
  }
  return DEFAULT_LEAD_USER;
}

export function setActiveUser(user: ActiveUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    window.dispatchEvent(new CustomEvent('mittsure_user_changed', { detail: user }));
  } catch (e) {
    console.error('Error writing active user to localStorage:', e);
  }
}

export function resetToLeadUser(): ActiveUser {
  setActiveUser(DEFAULT_LEAD_USER);
  return DEFAULT_LEAD_USER;
}

export function subscribeToUserChange(callback: (user: ActiveUser) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const custom = event as CustomEvent<ActiveUser>;
    if (custom.detail) {
      callback(custom.detail);
    } else {
      callback(getActiveUser());
    }
  };

  const storageHandler = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) {
      callback(getActiveUser());
    }
  };

  window.addEventListener('mittsure_user_changed', handler);
  window.addEventListener('storage', storageHandler);

  return () => {
    window.removeEventListener('mittsure_user_changed', handler);
    window.removeEventListener('storage', storageHandler);
  };
}

export function buildUserQueryParams(user?: ActiveUser): string {
  const u = user || (typeof window !== 'undefined' ? getActiveUser() : DEFAULT_LEAD_USER);
  const params = new URLSearchParams();
  if (u.name) params.append('repName', u.name);
  if (u.id) params.append('repId', u.id);
  if (u.targetDistrict && u.targetDistrict !== 'ALL') params.append('district', u.targetDistrict);
  if (u.baseLat) params.append('baseLat', String(u.baseLat));
  if (u.baseLng) params.append('baseLng', String(u.baseLng));
  return params.toString();
}
