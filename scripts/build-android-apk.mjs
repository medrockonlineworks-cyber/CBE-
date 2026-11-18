import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const rootDir = process.cwd();
const androidDir = path.join(rootDir, 'android');
const publicDownloadsDir = path.join(rootDir, 'public', 'downloads');
const distDownloadsDir = path.join(rootDir, 'dist', 'downloads');
const isRelease = process.argv.includes('--release');

const defaultSdkDir = '/opt/android-sdk';
if (!process.env.ANDROID_HOME && fs.existsSync(defaultSdkDir)) {
  process.env.ANDROID_HOME = defaultSdkDir;
  process.env.ANDROID_SDK_ROOT = defaultSdkDir;
}

function run(cmd, cwd = rootDir) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: process.env });
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
// Do not bundle downloadable APK binaries inside the APK's own Capacitor assets
fs.rmSync(distDownloadsDir, { recursive: true, force: true });
run('npx cap sync android');

const defaultJdk21Dir = '/usr/lib/jvm/java-21-openjdk-amd64';
if (fs.existsSync(defaultJdk21Dir)) {
  process.env.JAVA_HOME = defaultJdk21Dir;
  process.env.PATH = `${path.join(defaultJdk21Dir, 'bin')}:${process.env.PATH || ''}`;
}

const gradlew = process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
if (process.platform !== 'win32') {
  const gradlewPath = path.join(androidDir, 'gradlew');
  if (fs.existsSync(gradlewPath)) {
    fs.chmodSync(gradlewPath, 0o755);
  }
}
const gradleTask = isRelease ? 'assembleRelease' : 'assembleDebug';
if (!process.env.GRADLE_OPTS) {
  process.env.GRADLE_OPTS = '-Xmx192m -XX:+UseSerialGC';
}
run(`${gradlew} ${gradleTask} --no-daemon --max-workers=1 --console=plain -Dorg.gradle.vfs.watch=false -Dorg.gradle.jvmargs="-Xmx896m -XX:MaxMetaspaceSize=320m -XX:+UseSerialGC -Dfile.encoding=UTF-8"`, androidDir);

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
