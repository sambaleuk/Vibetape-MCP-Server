import { simpleGit } from 'simple-git';
import { execSync } from 'node:child_process';

export async function snapshotContext(cwd: string) {
  try {
    const git = simpleGit({ baseDir: cwd });
    const status = await git.status();
    const branch = status.current;
    const sha = (await git.revparse(['HEAD'])).trim();
    
    let diff = '';
    try { 
      diff = await git.diff(['--stat']); 
    } catch {
      // Ignore diff errors
    }

    // Optional lightweight test signal (do NOT run tests):
    let tests = '';
    try { 
      tests = execSync('git log -1 --pretty=%s', { 
        cwd, 
        stdio: ['ignore', 'pipe', 'ignore'] 
      }).toString(); 
    } catch {
      // Ignore test signal errors
    }

    // Optional deps snapshot (no install)
    let deps = '';
    try { 
      deps = execSync('node -p "try{require(\'./package.json\').dependencies}catch{\'\'}""', { 
        cwd, 
        stdio: ['ignore', 'pipe', 'ignore'] 
      }).toString(); 
    } catch {
      // Ignore deps snapshot errors
    }

    return { 
      git: { branch, sha }, 
      snapshot: { diff, tests, deps } 
    };
  } catch {
    return {};
  }
}
