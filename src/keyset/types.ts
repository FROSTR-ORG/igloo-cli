export type SharePolicyDefaults = {
  allowSend: boolean;
  allowReceive: boolean;
};

export type SharePeerPolicy = SharePolicyDefaults & {
  updatedAt?: string;
};

export type SharePolicy = {
  defaults: SharePolicyDefaults;
  peers?: Record<string, SharePeerPolicy>;
  updatedAt?: string;
};

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
  policy?: SharePolicy;
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
