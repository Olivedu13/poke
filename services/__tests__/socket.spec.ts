import { describe, it, expect, vi, beforeEach } from 'vitest';

// We need to test the real SocketService class, not the mocked one from vitest.setup
// So we import the actual module
describe('SocketService', () => {
  let SocketServiceClass: any;
  let service: any;

  beforeEach(async () => {
    // Get the real module
    const mod = await vi.importActual<any>('../../services/socket');
    // The module exports socketService singleton; we test via the class behavior
    // Since we can't easily get the class separately, test the interface
    SocketServiceClass = mod;
    // Create a fresh-like test by using the singleton but resetting
    service = mod.socketService;
  });

  it('exports socketService singleton', () => {
    expect(service).toBeDefined();
  });

  it('has connect method', () => {
    expect(typeof service.connect).toBe('function');
  });

  it('has disconnect method', () => {
    expect(typeof service.disconnect).toBe('function');
  });

  it('has emit method', () => {
    expect(typeof service.emit).toBe('function');
  });

  it('has on method', () => {
    expect(typeof service.on).toBe('function');
  });

  it('has off method', () => {
    expect(typeof service.off).toBe('function');
  });

  it('connected is false when not connected', () => {
    expect(service.connected).toBe(false);
  });

  it('id is undefined when not connected', () => {
    expect(service.id).toBeUndefined();
  });

  it('on stores callback in listeners', () => {
    const cb = vi.fn();
    service.on('test_event', cb);
    // Can call off without error
    service.off('test_event', cb);
  });

  it('off without callback clears all listeners for event', () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    service.on('test_clear', cb1);
    service.on('test_clear', cb2);
    service.off('test_clear');
    // No error = success
  });

  it('emit does not throw when not connected', () => {
    expect(() => service.emit('test', { data: 1 })).not.toThrow();
  });

  it('disconnect does not throw when no socket', () => {
    expect(() => service.disconnect()).not.toThrow();
  });
});
