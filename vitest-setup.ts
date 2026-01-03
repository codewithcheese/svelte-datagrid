import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock ResizeObserver for jsdom
class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

// Mock requestAnimationFrame for jsdom
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
	return setTimeout(() => callback(performance.now()), 16);
});

vi.stubGlobal('cancelAnimationFrame', (id: number) => {
	clearTimeout(id);
});
