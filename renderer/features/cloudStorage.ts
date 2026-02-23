const API_BASE = 'https://p.mise.run.place/https://s3-storage.zdvsn3xs.workers.dev/ClassTools';
const TOKEN =
  'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJidWNrZXQiOiJDbGFzc1Rvb2xzIn0.DhxqZY5bKdZIw_Bkw6Ls8MtaZga3BVH_f9BJHhAdhvY';

export type Item = {
  key: string;
  size: number;
  contentType: string;
  etag: string;
  lastModified: number;
};

type ListApiResponse = {
  items?: Item[];
};

function getApiUrl(name?: string) {
  return name ? `${API_BASE}/${encodeURIComponent(name)}` : `${API_BASE}/?list=1`;
}

export async function apiFetch(url: string, opt: RequestInit = {}) {
  return fetch(url, {
    ...opt,
    headers: {
      Authorization: TOKEN,
      ...(opt.headers || {}),
    },
  });
}

export async function loadList(): Promise<Item[]> {
  const res = await apiFetch(getApiUrl());
  const data = (await res.json()) as ListApiResponse;
  return data.items || [];
}

export async function loadFile(name: string, onProgress?: (percent: number) => void) {
  const res = await apiFetch(getApiUrl(name));
  const total = Number(res.headers.get('content-length') || 0);
  const reader = res.body?.getReader();

  if (!reader) {
    const text = await res.text();
    onProgress?.(100);
    return text;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) {
      onProgress?.(Math.min(99, Math.round((loaded / total) * 100)));
    }
  }

  const merged = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }

  const text = new TextDecoder().decode(merged);
  onProgress?.(100);
  return text;
}

export async function saveFile(name: string, content: string, onProgress?: (percent: number) => void) {
  const total = new TextEncoder().encode(content).length;

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', getApiUrl(name), true);
    xhr.setRequestHeader('Authorization', TOKEN);

    xhr.upload.onprogress = event => {
      if (!event.lengthComputable || total <= 0) return;
      onProgress?.(Math.min(99, Math.round((event.loaded / total) * 100)));
    };
    xhr.onload = () => {
      onProgress?.(100);
      resolve();
    };
    xhr.onerror = () => reject(new Error('Failed to upload backup'));
    xhr.send(content);
  });
}

export async function deleteFile(name: string) {
  await apiFetch(getApiUrl(name), { method: 'DELETE' });
}
