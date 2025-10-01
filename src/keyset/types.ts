export type ShareFileRecord = {
  id: string;
  name: string;
  share: string;
  salt: string;
  groupCredential: string;
  version?: number;
  savedAt?: string;
  metadata?: Record<string, unknown>;
  keysetName?: string;
  index?: number;
};

export type ShareMetadata = ShareFileRecord & {
  filepath: string;
};

export type KeyMaterial = {
  secretHex: string;
  npub: string;
  nsec: string;
};

export type GeneratedKeyset = {
  groupCredential: string;
  shareCredentials: string[];
};

export type KeysetForm = {
  name: string;
  threshold: number;
  total: number;
};
