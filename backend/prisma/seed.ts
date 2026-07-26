import "dotenv/config";
import { prisma } from "../src/config/prisma.js";
import { hashPassword } from "../src/lib/password.js";
import { ROLES } from "../src/lib/roles.js";
import { USE_CLOUD_STORAGE_KEY } from "../src/modules/settings/settings.service.js";

const ADMIN_EMAIL = "admin@gmail.com";
const ADMIN_PASSWORD = "admin123";
const ADMIN_NAME = "Admin";

async function main() {
  const userRole = await prisma.role.upsert({
    where: { name: ROLES.USER },
    update: {},
    create: { name: ROLES.USER },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: ROLES.ADMIN },
    update: {},
    create: { name: ROLES.ADMIN },
  });

  const existingAdmin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existingAdmin) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
  } else {
    const passwordHash = await hashPassword(ADMIN_PASSWORD);
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        name: ADMIN_NAME,
        passwordHash,
        roleId: adminRole.id,
      },
    });
    console.log(`Created admin user: ${ADMIN_EMAIL}`);
  }

  console.log(`Roles ready: ${userRole.name}, ${adminRole.name}`);

  await prisma.setting.upsert({
    where: { key: USE_CLOUD_STORAGE_KEY },
    update: {},
    create: { key: USE_CLOUD_STORAGE_KEY, value: "false" },
  });
  console.log(`Setting ready: ${USE_CLOUD_STORAGE_KEY}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
