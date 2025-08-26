import { supabase } from '../lib/supabaseClient';

export interface GrapeBunch {
  id: string;
  device_id: string;
  total_berries: number;
  filled_berries: number;
  created_at: string;
  completed_at: string | null;
}

export interface GrapeClick {
  id: string;
  bunch_id: string;
  position: number;
  note: string | null;
  clicked_at: string;
}

function randomTotalBerries(): number {
  const min = 20;
  const max = 30;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function getOrCreateActiveBunch(deviceId: string): Promise<GrapeBunch> {
  const { data: existing, error } = await supabase
    .from('grape_bunches')
    .select('*')
    .eq('device_id', deviceId)
    .is('completed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  if (existing) return existing as GrapeBunch;

  const total = randomTotalBerries();
  const { data: created, error: insertError } = await supabase
    .from('grape_bunches')
    .insert({ device_id: deviceId, total_berries: total, filled_berries: 0 })
    .select()
    .single();

  if (insertError) throw insertError;
  return created as GrapeBunch;
}

export async function toggleBerry(bunch: GrapeBunch, position: number, note?: string): Promise<GrapeBunch> {
  if (bunch.completed_at) return bunch;

  const { data: existing, error: findErr } = await supabase
    .from('grape_clicks')
    .select('id')
    .eq('bunch_id', bunch.id)
    .eq('position', position)
    .maybeSingle();
  if (findErr) throw findErr;

  if (existing) {
    const { error: delErr } = await supabase
      .from('grape_clicks')
      .delete()
      .eq('id', existing.id);
    if (delErr) throw delErr;
  } else {
    const { error: insErr } = await supabase
      .from('grape_clicks')
      .insert({ bunch_id: bunch.id, position, note: note ?? null });
    if (insErr) throw insErr;
  }

  // recompute filled_berries and completion
  const { data: clicks, error: clicksErr } = await supabase
    .from('grape_clicks')
    .select('id')
    .eq('bunch_id', bunch.id);
  if (clicksErr) throw clicksErr;

  const newFilled = clicks?.length ?? 0;
  const completedAt = newFilled >= bunch.total_berries ? new Date().toISOString() : null;

  const { data: updated, error: updErr } = await supabase
    .from('grape_bunches')
    .update({ filled_berries: newFilled, completed_at: completedAt })
    .eq('id', bunch.id)
    .select()
    .single();
  if (updErr) throw updErr;
  return updated as GrapeBunch;
}

export async function createNewBunch(deviceId: string): Promise<GrapeBunch> {
  const total = randomTotalBerries();
  const { data, error } = await supabase
    .from('grape_bunches')
    .insert({ device_id: deviceId, total_berries: total, filled_berries: 0 })
    .select()
    .single();
  if (error) throw error;
  return data as GrapeBunch;
}

export async function fetchHistory(deviceId: string, limit = 20): Promise<GrapeBunch[]> {
  const { data, error } = await supabase
    .from('grape_bunches')
    .select('*')
    .eq('device_id', deviceId)
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as GrapeBunch[]) ?? [];
}

export async function fetchClicks(bunchId: string): Promise<GrapeClick[]> {
  const { data, error } = await supabase
    .from('grape_clicks')
    .select('*')
    .eq('bunch_id', bunchId)
    .order('position', { ascending: true });
  if (error) throw error;
  return (data as GrapeClick[]) ?? [];
}

const grapesApi = {
  getOrCreateActiveBunch,
  toggleBerry,
  createNewBunch,
  fetchHistory,
  fetchClicks,
};

export default grapesApi;
