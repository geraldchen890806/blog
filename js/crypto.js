

import { AES, enc } from 'crypto-js';
export const aes_encrypt = (plainText, key, iv) => {
  const encrypted = AES.encrypt(plainText, enc.Utf8.parse(key), {
    iv: enc.Utf8.parse(iv),
  });
  return enc.Base64.stringify(encrypted.ciphertext);
};

export const aes_decrypt = (ciphertext, key, iv) => {
  const decrypted = AES.decrypt(ciphertext, enc.Utf8.parse(key), {
    iv: enc.Utf8.parse(iv),
  });
  return decrypted.toString(enc.Utf8);
};

if (typeof window !== 'undefined') {
  window.aes_encrypt = aes_encrypt;
  window.aes_decrypt = aes_decrypt;
}
