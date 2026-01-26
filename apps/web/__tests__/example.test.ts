import { describe, it, expect } from 'vitest';

describe('Example Test', () => {
  it('should pass a basic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should verify the test setup works', () => {
    const greeting = 'PlaneShift';
    expect(greeting).toContain('Plane');
  });
});
