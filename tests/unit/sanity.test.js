import { describe, it, expect } from 'vitest';

describe('Sanity Check', () => {
  it('should pass a basic assertion', () => {
    expect(1 + 1).toBe(2);
  });

  it('should have access to DOM APIs via happy-dom', () => {
    const div = document.createElement('div');
    div.textContent = 'Hello, Test!';
    expect(div.textContent).toBe('Hello, Test!');
  });

  it('should have access to localStorage mock', () => {
    localStorage.setItem('testKey', 'testValue');
    expect(localStorage.getItem('testKey')).toBe('testValue');
  });
});
