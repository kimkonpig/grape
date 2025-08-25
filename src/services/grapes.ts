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

export async function addBerry(bunch: GrapeBunch, note?: string): Promise<GrapeBunch> {
  if (bunch.completed_at) return bunch;
  const nextPosition = bunch.filled_berries + 1;
  const willComplete = nextPosition >= bunch.total_berries;

  const { error: clickError } = await supabase
    .from('grape_clicks')
    .insert({ bunch_id: bunch.id, position: nextPosition, note: note ?? null });
  if (clickError) throw clickError;

  const updates: Partial<GrapeBunch> & { filled_berries: number } = {
    filled_berries: nextPosition,
    ...(willComplete ? { completed_at: new Date().toISOString() } : {}),
  } as any;

  const { data: updated, error: updateError } = await supabase
    .from('grape_bunches')
    .update(updates)
    .eq('id', bunch.id)
    .select()
    .single();

  if (updateError) throw updateError;
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


