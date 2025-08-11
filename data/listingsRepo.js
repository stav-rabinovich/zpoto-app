// data/listingsRepo.js
import { getJSON, setJSON } from './storage';

const KEY = 'LISTINGS_V1';

// נורמליזציה (תומך גם בשדה הישן requiresManualApproval)
function normalize(listing) {
  return {
    id: listing.id,
    title: listing.title ?? '',
    address: listing.address ?? '',
    latitude: listing.latitude ?? null,
    longitude: listing.longitude ?? null,
    pricePerHour: listing.pricePerHour ?? 12,
    requiresManualApproval: typeof listing.requiresManualApproval === 'boolean'
      ? listing.requiresManualApproval
      : undefined,
    approvalMode: listing.approvalMode
      ? listing.approvalMode // 'auto' | 'manual'
      : (listing.requiresManualApproval ? 'manual' : 'auto'),
    status: listing.status ?? 'active',
    photos: listing.photos ?? [],
    createdAt: listing.createdAt ?? Date.now(),
    updatedAt: listing.updatedAt ?? Date.now(),
  };
}

export async function getAll() {
  const raw = (await getJSON(KEY, [])) || [];
  return raw.map(normalize);
}

export async function saveAll(items) {
  await setJSON(KEY, items.map(normalize));
  return items;
}

export async function upsert(listing) {
  const all = await getAll();
  const idx = all.findIndex((l) => l.id === listing.id);
  const now = Date.now();
  const withTimestamps = normalize({
    ...listing,
    updatedAt: now,
    createdAt: listing.createdAt ?? now,
  });
  if (idx >= 0) all[idx] = withTimestamps;
  else all.push(withTimestamps);
  await saveAll(all);
  return withTimestamps;
}

export async function getById(id) {
  const all = await getAll();
  return all.find((l) => l.id === id) || null;
}

export async function byStatus(status) {
  const all = await getAll();
  return all.filter((l) => l.status === status);
}

export async function setStatus(id, status) {
  const all = await getAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  all[idx] = normalize({ ...all[idx], status, updatedAt: Date.now() });
  await saveAll(all);
  return all[idx];
}

export async function setApprovalMode(id, mode /* 'auto' | 'manual' */) {
  const all = await getAll();
  const idx = all.findIndex((l) => l.id === id);
  if (idx === -1) return null;
  all[idx] = normalize({
    ...all[idx],
    approvalMode: mode,
    requiresManualApproval: mode === 'manual',
    updatedAt: Date.now(),
  });
  await saveAll(all);
  return all[idx];
}
