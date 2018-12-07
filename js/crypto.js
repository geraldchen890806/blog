/** Copyright © 2013-2019 DataYes, All Rights Reserved. */

import { AES, enc } from 'crypto-js';
// g89 b27
// cmt fXPDLv1N9TyF4XvcRVOrV6amdsVP+Tf05zz2Pc15Xju30heFKLkS6FCDuDPIPzBs8MtTgKp5HTVHAqfGzB7h1lzsBIZgkAZDjccu/U9sFuo=
// trezor 07ketdzJPefEz2TcNERPqKJ34jFW9aZvx9A3jdS/c2erMPgcJ3dyp4a5axbJd16q8s1jzjVwcnu1oQcZSZNin4NiufMg+oH0gX284Dmmtsa8o6dY3o6ALESpm//IFzNFdaf24z5sn/FvyXvrZ6tZeic3Nee6aiVarP8qSbXiMJMTGOFgxxKBZHM2QquQshZnQJllrGTjOgqC3hOpJ0N7M2NI5HSIqNgnLGo1Ihx8Do8=
// xx MXTy57q3ICrLyKh4SLb8HlNHqKqO8zz5ErLPnggM9FE/GpPo4CVcQDFAO6dBeHYmZtNcHaQN233hVym2NXQYgFXaYzVVvCTOrJxLM2U5Y8Q=
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
