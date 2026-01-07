import bcrypt from "bcrypt";

const password = "Admin1234&&"; // cambia la contraseña
const hash = await bcrypt.hash(password, 10);

console.log("PASSWORD:", password);
console.log("BCRYPT HASH:", hash);
