export type ShareFileRecord = {
  id: string;
  name: string;
  keysetName: string;
  index: number;
  share: string;
  salt: string;
  groupCredential: string;
  savedAt: string;
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
