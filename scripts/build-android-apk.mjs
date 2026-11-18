import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const publicDownloadsDir = path.join(rootDir, 'public', 'downloads');
const distDownloadsDir = path.join(rootDir, 'dist', 'downloads');
const isRelease = process.argv.includes('--release');

function run(cmd, cwd = rootDir) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
}

function findJava() {
  try {
    execSync('java -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (!findJava()) {
  console.error('\n[APK Build] Error: Java JDK (JDK 17+) was not found in PATH.');
  console.error('Install JDK 17+ and Android SDK (or open ./android in Android Studio), then re-run: npm run build:apk');
  process.exit(1);
}

console.log(`[APK Build] Building web assets and syncing Capacitor Android (${isRelease ? 'release' : 'debug'})...`);
run('npm run build');

const aistudioDistDir = path.join(rootDir, 'dist', 'assets', 'aistudio');
if (fs.existsSync(aistudioDistDir)) {
  fs.rmSync(aistudioDistDir, { recursive: true, force: true });
}
const staleDistApk = path.join(distDownloadsDir, 'cbe-mobil.apk');
if (fs.existsSync(staleDistApk)) {
  fs.unlinkSync(staleDistApk);
}

run('npx cap sync android');

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug';
run(`${gradlew} ${gradleTask}`, androidDir);

const candidateApks = isRelease
  ? [
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk'),
      path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release-unsigned.apk'),
    ]
  : [path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk')];

const builtApk = candidateApks.find((p) => fs.existsSync(p));
if (!builtApk) {
  console.error('\n[APK Build] Gradle finished, but no APK file was found at:', candidateApks);
  process.exit(1);
}

fs.mkdirSync(publicDownloadsDir, { recursive: true });
const targetPublicApk = path.join(publicDownloadsDir, 'cbe-mobil.apk');
fs.copyFileSync(builtApk, targetPublicApk);

const stat = fs.statSync(targetPublicApk);
const metadata = {
  fileName: 'CBE-Mobil.apk',
  downloadUrl: '/downloads/cbe-mobil.apk',
  versionName: '1.0',
  buildType: isRelease ? 'release' : 'debug',
  sizeBytes: stat.size,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(path.join(publicDownloadsDir, 'apk-metadata.json'), JSON.stringify(metadata, null, 2));

if (fs.existsSync(path.join(rootDir, 'dist'))) {
  fs.mkdirSync(distDownloadsDir, { recursive: true });
  fs.copyFileSync(targetPublicApk, path.join(distDownloadsDir, 'cbe-mobil.apk'));
  fs.writeFileSync(path.join(distDownloadsDir, 'apk-metadata.json'), JSON.stringify(metadata, null, 2));
}

console.log(`\n[APK Build] Ready! Android APK published to /public/downloads/cbe-mobil.apk (${(stat.size / (1024 * 1024)).toFixed(2)} MB).`);
