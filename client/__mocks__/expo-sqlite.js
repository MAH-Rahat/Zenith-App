export const openDatabaseAsync = jest.fn(() => Promise.resolve({
  execAsync: jest.fn(() => Promise.resolve()),
  getAllAsync: jest.fn(() => Promise.resolve([])),
  runAsync: jest.fn(() => Promise.resolve({ lastInsertRowId: 1, changes: 1 })),
  withTransactionAsync: jest.fn((callback) => callback()),
  closeAsync: jest.fn(() => Promise.resolve()),
}));

export const deleteDatabaseAsync = jest.fn(() => Promise.resolve());
