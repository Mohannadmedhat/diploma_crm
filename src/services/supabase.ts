import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

export const isCloudConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = isCloudConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

// Map simple username to a pseudo-email for Supabase authentication
function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@diploma.local`;
}

function translateAuthError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('invalid login credentials') || m.includes('invalid credentials')) {
    return 'اسم المستخدم أو كلمة المرور غير صحيحة';
  }
  if (m.includes('user already registered') || m.includes('already exists') || m.includes('email already')) {
    return 'اسم المستخدم مسجل بالفعل';
  }
  if (m.includes('should be at least 6 characters')) {
    return 'كلمة المرور يجب أن تكون من 6 خانات أو أحرف على الأقل';
  }
  if (m.includes('network') || m.includes('failed to fetch')) {
    return 'فشل الاتصال بالشبكة، يرجى التحقق من اتصال الإنترنت';
  }
  return msg;
}

export async function signInCloud(username: string, password: string): Promise<{ success: boolean; message: string; session: any }> {
  if (!supabase) return { success: false, message: 'الاتصال السحابي غير مهيأ بعد.', session: null };

  try {
    const userClean = username.trim().toLowerCase();
    if (!userClean) return { success: false, message: 'يرجى إدخال اسم المستخدم', session: null };

    const email = usernameToEmail(userClean);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, message: translateAuthError(error.message), session: null };
    }

    return { success: true, message: 'تم تسجيل الدخول بنجاح', session: data.session };
  } catch (e: any) {
    console.error('Error in cloud signin', e);
    return { success: false, message: 'حدث خطأ غير متوقع أثناء تسجيل الدخول', session: null };
  }
}

export async function signOutCloud(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error('Error in cloud signout', e);
  }
}

// ============================================================
// IMPERSONATION STATE (For Admin editing user data)
// ============================================================
let impersonatedUserId: string | null = null;

export function setImpersonatedUserId(id: string | null): void {
  impersonatedUserId = id;
}

export function getImpersonatedUserId(): string | null {
  return impersonatedUserId;
}

export async function downloadCloudData(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const targetId = impersonatedUserId || user.id;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('user_id', targetId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching user cloud data', error);
      return null;
    }

    return data ? data.data : null;
  } catch (e) {
    console.error('Exception in downloadCloudData', e);
    return null;
  }
}

export async function uploadCloudData(payload: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const targetId = impersonatedUserId || user.id;
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: targetId,
        data: payload,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error uploading user cloud data', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception in uploadCloudData', e);
    return false;
  }
}

// ============================================================
// SHARED DATA (Instructors, Mentors, DiplomaTypes, Templates)
// ============================================================

export async function downloadSharedData(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('shared_data')
      .select('data')
      .eq('id', 'global')
      .maybeSingle();

    if (error) {
      console.error('Error fetching shared data', error);
      return null;
    }

    return data ? data.data : null;
  } catch (e) {
    console.error('Exception in downloadSharedData', e);
    return null;
  }
}

export async function uploadSharedData(payload: any): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('shared_data')
      .upsert({
        id: 'global',
        data: payload,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error uploading shared data', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception in uploadSharedData', e);
    return false;
  }
}

// ============================================================
// ADMIN FUNCTIONS (view/manage all users' data)
// ============================================================

export interface AdminUserRecord {
  user_id: string;
  email?: string;
  updated_at: string;
  data: any;
}

export async function getAllUsersData(): Promise<AdminUserRecord[]> {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('user_id, data, updated_at')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching all users data', error);
      return [];
    }

    return data || [];
  } catch (e) {
    console.error('Exception in getAllUsersData', e);
    return [];
  }
}

export async function deleteUserData(userId: string): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('user_data')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting user data', error);
      return false;
    }

    return true;
  } catch (e) {
    console.error('Exception in deleteUserData', e);
    return false;
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || null;
  } catch {
    return null;
  }
}

export async function getCurrentUserEmail(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.email || null;
  } catch {
    return null;
  }
}

export async function registerNewUser(username: string, password: string): Promise<{ success: boolean; message: string }> {
  if (!isCloudConfigured || !supabase) return { success: false, message: 'الاتصال السحابي غير مهيأ بعد.' };
  try {
    const email = usernameToEmail(username);
    // Create a secondary client that does NOT persist the session
    const signupClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    
    const { error } = await signupClient.auth.signUp({
      email,
      password
    });
    
    if (error) {
      return { success: false, message: translateAuthError(error.message) };
    }
    
    return { success: true, message: 'تم تسجيل المستخدم بنجاح' };
  } catch (e: any) {
    console.error('Error in registerNewUser', e);
    return { success: false, message: 'حدث خطأ غير متوقع أثناء تسجيل الحساب' };
  }
}
