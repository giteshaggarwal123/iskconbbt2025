const { createClient } = require('@supabase/supabase-js');

// TODO: Fill in your Supabase project URL and service role key
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'YOUR_SERVICE_ROLE_KEY';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deleteAllFoldersAndContents() {
  // 1. Get all folder IDs
  const { data: folders, error: folderError } = await supabase
    .from('folders')
    .select('id');

  if (folderError) {
    console.error('Error fetching folders:', folderError);
    return;
  }

  if (!folders || folders.length === 0) {
    console.log('No folders found.');
    return;
  }

  const folderIds = folders.map(f => f.id);

  // 2. Delete all documents in those folders
  const { error: docError } = await supabase
    .from('documents')
    .delete()
    .in('folder_id', folderIds);

  if (docError) {
    console.error('Error deleting documents:', docError);
    return;
  }

  // 3. Delete all folders
  const { error: delError } = await supabase
    .from('folders')
    .delete()
    .in('id', folderIds);

  if (delError) {
    console.error('Error deleting folders:', delError);
    return;
  }

  console.log('All folders and their contents have been deleted!');
}

deleteAllFoldersAndContents(); 