/**
 * Type declarations for Phase 2 dependencies
 */

// expo-sqlite types are included in the package
declare module 'expo-sqlite' {
  export * from 'expo-sqlite/build/index';
}

// expo-secure-store types are included in the package
declare module 'expo-secure-store' {
  export * from 'expo-secure-store/build/SecureStore';
}

// @google/generative-ai types are included in the package
declare module '@google/generative-ai' {
  export * from '@google/generative-ai/dist/index';
}

// fast-check types are included in the package
declare module 'fast-check' {
  export * from 'fast-check/lib/types/fast-check';
}
