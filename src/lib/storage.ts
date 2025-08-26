import { EMPTY_STATE, Farm, StoredState } from '@/types/farm';

const STORAGE_KEY = 'ripen_state_v1';

function safeParse(json: string | null): StoredState {
  if (!json) return EMPTY_STATE;
  try {
    const data = JSON.parse(json);
    if (!data || typeof data !== 'object') return EMPTY_STATE;
    if (!Array.isArray((data as StoredState).farms)) return EMPTY_STATE;
    return data as StoredState;
  } catch {
    return EMPTY_STATE;
  }
}

export function loadState(): StoredState {
  if (typeof window === 'undefined') return EMPTY_STATE;
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

export function saveState(state: StoredState): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function upsertFarm(farm: Farm): void {
  const state = loadState();
  const index = state.farms.findIndex(f => f.id === farm.id);
  if (index >= 0) state.farms[index] = farm;
  else state.farms.unshift(farm);
  saveState({ farms: state.farms });
}

export function getFarmById(id: string): Farm | undefined {
  return loadState().farms.find(f => f.id === id);
}

export function deleteFarm(id: string): void {
  const state = loadState();
  saveState({ farms: state.farms.filter(f => f.id !== id) });
}


