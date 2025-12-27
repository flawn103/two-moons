import crypto from "crypto";
import { PASSWORD_SALT } from "@/services/constants";

export function genHash(password) {
  const salt = PASSWORD_SALT;
  const hash = crypto.createHmac("sha512", salt);
  hash.update(password);
  const value = hash.digest("hex");
  return value;
}
