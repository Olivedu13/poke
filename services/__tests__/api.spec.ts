import { describe, it, expect, vi, beforeEach } from 'vitest';

// The api module is globally mocked via axios mock in vitest.setup.ts
// We test the mocked interface that components use

describe('api service', () => {
  let api: any;

  beforeEach(async () => {
    // The api module uses the globally mocked axios
    const mod = await import('../../services/api');
    api = mod.api;
    vi.clearAllMocks();
  });

  it('exports api object', () => {
    expect(api).toBeDefined();
  });

  it('has get method', () => {
    expect(typeof api.get).toBe('function');
  });

  it('has post method', () => {
    expect(typeof api.post).toBe('function');
  });

  it('get returns success data by default', async () => {
    const res = await api.get('/test');
    expect(res.data.success).toBe(true);
  });

  it('post can be called with data', async () => {
    await api.post('/test', { key: 'value' });
    expect(api.post).toHaveBeenCalledWith('/test', { key: 'value' });
  });

  it('get can be called with endpoint path', async () => {
    await api.get('/shop/items');
    expect(api.get).toHaveBeenCalledWith('/shop/items');
  });

  it('has interceptors setup', () => {
    expect(api.interceptors).toBeDefined();
    expect(api.interceptors.request).toBeDefined();
    expect(api.interceptors.response).toBeDefined();
  });
});
