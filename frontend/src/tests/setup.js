import '@testing-library/jest-dom/vitest'

// ponytail: ResizeObserver stub for recharts ResponsiveContainer
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock Firebase auth globally
vi.mock('../firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      cb(null)
      return vi.fn()
    }),
  },
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn((cb) => {
      cb(null)
      return vi.fn()
    }),
  })),
}))

// Mock api module with a stub that can be configured per-test
const mockApi = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}

vi.mock('../api', () => ({
  api: mockApi,
}))

export { mockApi }
