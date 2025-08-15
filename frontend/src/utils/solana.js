// Temporary stub to avoid bundling Node polyfills while you restore UI.
// NOTE: We intentionally do NOT import '@metaplex-foundation/js' here.

export const getMetaplex = () => {
  throw new Error("Metaplex temporarily disabled");
};

export const uploadToArweave = async () => {
  throw new Error("Upload temporarily disabled");
};

export const createNFTMetadata = () => ({});

// Browser-native SHA-256
export const sha256Hex = async (file) => {
  const buf = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

// Keep old named exports that other files might reference
export const connection = null;
