import { createHash } from 'node:crypto';

function buildHash(fields, integrationKey) {
  const message = Object.values(fields).join('') + integrationKey;
  return createHash('sha512').update(message).digest('hex').toUpperCase();
}

export function verifyCallback(params, integrationKey) {
  const { hash, ...rest } = params;
  if (!hash) return false;
  return buildHash(rest, integrationKey) === hash.toUpperCase();
}
