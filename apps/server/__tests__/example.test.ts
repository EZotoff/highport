import { describe, it, expect } from 'vitest';

describe('Server Example Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify the test setup works', () => {
    const serviceName = 'PlaneShift Server';
    expect(serviceName).toContain('Server');
  });
});
