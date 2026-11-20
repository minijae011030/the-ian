/**
 * 에디터 저장 = GitHub에 커밋.
 * 바뀐 방 파일들을 커밋 하나로 묶어서 올림 (Git Data API: 트리 만들고 → 커밋 만들고 → 브랜치 옮기기).
 * 토큰은 이 레포 contents 쓰기 권한만 있는 fine-grained 토큰. 브라우저 localStorage에만 저장
 */
const SETTINGS_KEY = 'the-ian:admin-settings'

export type GithubSettings = { token: string; repo: string; branch: string }

export function loadSettings(): GithubSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}')
    return { token: '', repo: 'minijae011030/the-ian', branch: 'main', ...saved }
  } catch {
    return { token: '', repo: 'minijae011030/the-ian', branch: 'main' }
  }
}

export function saveSettings(settings: GithubSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // 시크릿 창 등에서 막혀도 이번 세션 동안은 메모리 값으로 동작
  }
}

async function api<T>(settings: GithubSettings, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`https://api.github.com/repos/${settings.repo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${settings.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`GitHub ${res.status}: ${detail.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

/** 레포에서 파일 하나 읽기 (배포 기다리지 않고 최신 커밋 기준). 없으면 null */
export async function readFile(settings: GithubSettings, path: string): Promise<string | null> {
  try {
    const data = await api<{ content: string }>(
      settings,
      `/contents/${path}?ref=${encodeURIComponent(settings.branch)}`,
    )
    const bytes = Uint8Array.from(atob(data.content.replace(/\n/g, '')), (c) => c.charCodeAt(0))
    return new TextDecoder().decode(bytes)
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('GitHub 404')) return null
    throw e
  }
}

/** 여러 파일을 커밋 하나로. 반환: 커밋 URL */
export async function commitFiles(
  settings: GithubSettings,
  files: { path: string; content: string }[],
  message: string,
): Promise<string> {
  const ref = await api<{ object: { sha: string } }>(settings, `/git/ref/heads/${settings.branch}`)
  const parent = await api<{ tree: { sha: string } }>(settings, `/git/commits/${ref.object.sha}`)
  const tree = await api<{ sha: string }>(settings, '/git/trees', {
    method: 'POST',
    body: JSON.stringify({
      base_tree: parent.tree.sha,
      tree: files.map((f) => ({ path: f.path, mode: '100644', type: 'blob', content: f.content })),
    }),
  })
  const commit = await api<{ sha: string; html_url: string }>(settings, '/git/commits', {
    method: 'POST',
    body: JSON.stringify({ message, tree: tree.sha, parents: [ref.object.sha] }),
  })
  await api(settings, `/git/refs/heads/${settings.branch}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha }),
  })
  return commit.html_url
}
