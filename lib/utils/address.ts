/**
 * Utility functions for handling Ethereum addresses
 */

/**
 * Normalizes an Ethereum address to lowercase
 * @param address - The address to normalize
 * @returns The normalized address in lowercase
 */
export function normalizeAddress(address: string): string {
  if (!address) {
    throw new Error("Address is required");
  }
  return address.toLowerCase();
}

/**
 * Validates if a string is a valid Ethereum address format
 * @param address - The address to validate
 * @returns True if the address format is valid
 */
export function isValidAddressFormat(address: string): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  // Check if it starts with 0x and has 40 hex characters
  const addressRegex = /^0x[a-fA-F0-9]{40}$/;
  return addressRegex.test(address);
}

/**
 * Validates and normalizes an Ethereum address
 * @param address - The address to validate and normalize
 * @returns The normalized address
 * @throws Error if the address is invalid
 */
export function validateAndNormalizeAddress(address: string): string {
  if (!address) {
    throw new Error("Address is required");
  }

  if (!isValidAddressFormat(address)) {
    throw new Error("Invalid Ethereum address format");
  }

  return normalizeAddress(address);
}

/**
 * Compares two addresses for equality (case-insensitive)
 * @param address1 - First address
 * @param address2 - Second address
 * @returns True if addresses are equal (case-insensitive)
 */
export function addressesEqual(address1: string, address2: string): boolean {
  if (!address1 || !address2) {
    return false;
  }

  return normalizeAddress(address1) === normalizeAddress(address2);
}
