import prismaPkg from "../../generated/prisma/index.js";

const { PrismaClient } = prismaPkg;

export const prisma = new PrismaClient();
