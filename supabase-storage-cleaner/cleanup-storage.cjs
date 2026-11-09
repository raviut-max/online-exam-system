require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SECRET_KEY;

const BUCKETS = [
  'followup-images',
  'patient-status-images',
  'life-schedule-images'
];

const PAGE_SIZE = 100;
const DELETE_BATCH = 100;

if (!URL || !KEY) {
  console.error('ERROR: กรุณาตรวจสอบไฟล์ .env');
  process.exit(1);
}

if (!/^https:\/\/[^/]+\.supabase\.co$/.test(URL)) {
  console.error('ERROR: Project URL ไม่ถูกต้อง');
  process.exit(1);
}

if (!KEY.startsWith('sb_secret_') &&
    !KEY.startsWith('eyJ')) {
  console.error('ERROR: Secret key ไม่ถูกต้อง');
  process.exit(1);
}

const supabase = createClient(URL, KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function scanFolder(bucket, folder = '') {
  let offset = 0;
  const files = [];

  while (true) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      throw new Error(
        `อ่าน ${bucket}/${folder}: ${error.message}`
      );
    }

    if (!data || data.length === 0) break;

    for (const item of data) {
      const fullPath = folder
        ? `${folder}/${item.name}`
        : item.name;

      // Directory entries have no object ID.
      if (item.id === null) {
        const nested = await scanFolder(bucket, fullPath);
        files.push(...nested);
      } else {
        files.push({
          path: fullPath,
          size: Number(item.metadata?.size || 0)
        });
      }
    }

    offset += data.length;

    if (data.length < PAGE_SIZE) break;
  }

  return files;
}

async function askConfirmation(message) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(message, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const deleting = process.argv.includes('--delete');

  console.log('\nSUPABASE STORAGE CLEANER');
  console.log('Project:', URL);
  console.log('Mode:', deleting ? 'DELETE' : 'DRY RUN');

  const results = [];

  // Scan every bucket before deleting anything.
  for (const bucket of BUCKETS) {
    console.log(`\nScanning: ${bucket}`);

    const files = await scanFolder(bucket);

    const totalBytes = files.reduce(
      (sum, file) => sum + file.size, 0
    );

    results.push({ bucket, files, totalBytes });

    console.log('Files:', files.length);
    console.log('Size:', (totalBytes / 1024 / 1024).toFixed(2), 'MB');
  }

  const totalFiles = results.reduce(
    (sum, result) => sum + result.files.length, 0
  );

  console.log('\nTOTAL FILES:', totalFiles);

  if (!deleting) {
    console.log('\nDRY RUN: ยังไม่มีไฟล์ใดถูกลบ');
    console.log('ตรวจสอบแล้ว หากต้องการลบจริง ใช้คำสั่ง:');
    console.log('node cleanup-storage.cjs --delete');
    return;
  }

  if (totalFiles === 0) {
    console.log('ไม่มีไฟล์ให้ลบ');
    return;
  }

  const answer = await askConfirmation(
    '\nพิมพ์ DELETE ALL เพื่อยืนยันลบไฟล์ทั้งหมด: '
  );

  if (answer !== 'DELETE ALL') {
    console.log('ยกเลิก ไม่มีการลบไฟล์');
    return;
  }

  for (const result of results) {
    console.log(`\nDeleting: ${result.bucket}`);

    const paths = result.files.map(file => file.path);

    for (let i = 0; i < paths.length; i += DELETE_BATCH) {
      const batch = paths.slice(i, i + DELETE_BATCH);

      const { error } = await supabase.storage
        .from(result.bucket)
        .remove(batch);

      if (error) {
        throw new Error(
          `ลบ ${result.bucket} ไม่สำเร็จ: ${error.message}`
        );
      }

      console.log(
        `Deleted ${Math.min(i + batch.length, paths.length)} / ${paths.length}`
      );
    }
  }

  console.log('\nVerifying storage...');

  for (const bucket of BUCKETS) {
    const remaining = await scanFolder(bucket);

    console.log(`${bucket}: เหลือ ${remaining.length} files`);

    if (remaining.length > 0) {
      console.error('WARNING: ยังมีไฟล์เหลืออยู่');
    }
  }

  console.log('\nFINISHED');
}

main().catch(error => {
  console.error('\nERROR:', error.message);
  process.exitCode = 1;
});
