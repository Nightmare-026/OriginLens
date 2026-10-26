/**
 * Pinned C2PA runtime facts. These values are asserted by tests against the
 * installed package and the copied same-origin asset, so a version drift fails
 * loudly instead of silently validating with different bytes.
 */

export const C2PA_SDK_VERSION = '0.15.4';
export const C2PA_WASM_PATH = `/c2pa/${C2PA_SDK_VERSION}/c2pa_bg.wasm`;
export const C2PA_WASM_SHA256 =
  '01b8e25f637aaa3fe197bc5646ce114810db4789db19af7e1f6bfebe9e9858df';
export const C2PA_WASM_SRI =
  'sha512-kE5aMTH5JnHL2DqAcxv9AbgXLkecSavJNXEnrsaLGz1lN8nSFbbEze/jqSJqRKpa1Q5f6U3Vk9jXcVfmfvxjkw==';

export const C2PA_CHECKER_NAME = 'c2pa-web';

/**
 * This build configures no trust anchors and performs no network-dependent
 * trust or revocation lookup. Signature/content-binding validation can still be
 * reported, but signer trust and revocation are never promoted beyond
 * not_evaluated.
 */
export const C2PA_TRUST_POLICY_ID = 'originlens-embedded-only-no-trust-anchors-v1';

export const C2PA_LIMITATIONS = [
  'Only credentials embedded in the supplied file are inspected; external or durable credentials are not fetched.',
  'This build configures no signer trust anchors and performs no network trust or revocation lookup, so signer trust and revocation are not evaluated.',
  'A valid signature establishes integrity under the signer key; it does not establish that the signer is trustworthy or that recorded statements are true.',
  'Recorded actions and ingredients are statements contained in the manifest, not independently observed events or proof of chronology.',
] as const;
