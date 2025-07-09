// Bulk add members to Supabase Auth, profiles, and user_roles
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const members = [
  { displayName: 'HH Bhakti Purushottam Swami', username: 'Bhakti Purushottam Swami', email: 'bps@iskconbureau.in', password: 'bps@2025' },
  { displayName: 'HH Bhakti Rasamrita Swami', username: 'Bhakti Rasamrita Swami', email: 'brs@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'HH Bhaktivinode Swami', username: 'Bhaktivinode Swami', email: 'bvs@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'HH Jayapataka Swami', username: 'Jayapataka Swami', email: 'jps@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'HH Lokanath Swami', username: 'Lokanath Swami', email: 'ls@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Basu Ghosh Das (Vice Chairman)', username: 'Basu Gosh Das', email: 'bgd@iskconbureau.in', password: 'vU7#plEx!M1o' },
  { displayName: 'Sri Bhaktarupa Das', username: 'Bhaktarupa Das', email: 'brd@iskconbureau.in', password: 'Gr0b!Xen$9zQ' },
  { displayName: 'Sri Braj Hari Das', username: 'Braj Hari Das', email: 'bhd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Dayaram Das', username: 'Dayaram Das', email: 'drd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Devakinandan Das', username: 'Devakinandan Das', email: 'dnd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Jiva Das', username: 'Jiva Das', email: 'jd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Mahaman Das', username: 'Mahaman Das', email: 'md@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Rasraj Dasa', username: 'Rasraj Das', email: 'rd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Revati Raman Das', username: 'Revati Raman Das', email: 'rrd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Shankadhari Das', username: 'Shankadhari Das', email: 'skd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
  { displayName: 'Sri Yudhistar Das', username: 'Yudhistar Das', email: 'yd@iskconbureau.in', password: 'Zq!9@rLi8T$w' },
];

function splitName(displayName) {
  const parts = displayName.trim().split(' ');
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  };
}

async function addMember(member) {
  try {
    // 1. Create user in Auth
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: member.password,
      email_confirm: true,
    });
    let userId;
    let userAlreadyExists = false;
    if (userError && userError.message.includes('already registered')) {
      // User already exists, fetch their ID
      const { data: existingUser, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', member.email)
        .single();
      if (fetchError || !existingUser) {
        console.error(`Failed to fetch existing user for ${member.email}:`, fetchError?.message || 'Unknown error');
        return;
      }
      userId = existingUser.id;
      userAlreadyExists = true;
    } else if (userError || !userData?.user?.id) {
      console.error(`Failed to create user for ${member.email}:`, userError?.message || 'Unknown error');
      return;
    } else {
      userId = userData.user.id;
    }
    // 2. Insert or update profile
    const { first_name, last_name } = splitName(member.username);
    if (userAlreadyExists) {
      // Update profile
      const { error: updateError } = await supabase.from('profiles').update({
        first_name,
        last_name,
      }).eq('id', userId);
      if (updateError) {
        console.error(`Failed to update profile for ${member.email}:`, updateError.message);
        return;
      }
    } else {
      // Insert profile
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        email: member.email,
        first_name,
        last_name,
        phone: '',
      });
      if (insertError) {
        console.error(`Failed to insert profile for ${member.email}:`, insertError.message);
        return;
      }
    }
    // 3. Insert user role (ignore if already exists)
    const { error: roleError } = await supabase.from('user_roles').upsert({
      user_id: userId,
      role: 'member',
    }, { onConflict: ['user_id', 'role'] });
    if (roleError) {
      console.error(`Failed to assign role for ${member.email}:`, roleError.message);
      return;
    }
    console.log(`Successfully added/updated member: ${member.displayName} (${member.email})`);
  } catch (err) {
    console.error(`Unexpected error for ${member.email}:`, err.message || err);
  }
}

(async () => {
  for (const member of members) {
    await addMember(member);
  }
  console.log('Bulk member addition complete.');
})(); 