import { genHash } from "../utils/crypto";

export const genUser = (name: string, password: string) => {
  return {
    name,
    password: genHash(password),
  };
};

console.log(genUser("mooner", "Moayuisuda!123"));
