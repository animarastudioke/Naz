import { PrismaClient } from "../generated/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Passw0rd!", 12);

  const business = await prisma.business.create({
    data: {
      name: "Nairobi Lens Photography",
      slug: "nairobi-lens-photography",
      industry: "Photography",
      country: "KE",
      currency: "KES",
      vatRate: 16,
      kraPin: "P000000000A",
      invoicePrefix: "INV",
      quotePrefix: "QT",
    },
  });

  const owner = await prisma.user.create({
    data: { email: "owner@nairobilens.demo", passwordHash, fullName: "Amina Wanjiru", phone: "254712345678" },
  });

  await prisma.businessUser.create({
    data: { businessId: business.id, userId: owner.id, role: "OWNER", joinedAt: new Date() },
  });

  await prisma.branch.create({ data: { businessId: business.id, name: "Main Studio", isPrimary: true } });
  await prisma.businessIntegration.create({ data: { businessId: business.id } });

  const [weddingShoot, portrait, drone] = await Promise.all([
    prisma.service.create({
      data: { businessId: business.id, name: "Wedding Photography (Full Day)", category: "wedding", durationMins: 480, price: 85000, requiresDeposit: true, depositPercent: 30 },
    }),
    prisma.service.create({
      data: { businessId: business.id, name: "Portrait Session", category: "portrait", durationMins: 90, price: 8000 },
    }),
    prisma.service.create({
      data: { businessId: business.id, name: "Drone Aerial Coverage", category: "event", durationMins: 120, price: 15000 },
    }),
  ]);

  await prisma.servicePackage.create({
    data: {
      businessId: business.id,
      name: "Wedding Complete Package",
      eventType: "wedding",
      price: 95000,
      items: {
        create: [
          { serviceId: weddingShoot.id, quantity: 1 },
          { serviceId: drone.id, quantity: 1 },
        ],
      },
    },
  });

  await prisma.client.create({
    data: {
      businessId: business.id,
      fullName: "John & Grace Mwangi",
      phone: "254722000111",
      whatsappNumber: "254722000111",
      email: "johngrace@example.com",
      segment: "VIP",
      source: "referral",
      tags: ["wedding", "repeat"],
    },
  });

  await prisma.client.create({
    data: { businessId: business.id, fullName: "Corporate Events Ltd", phone: "254733000222", segment: "Corporate", source: "website" },
  });

  console.log("Seed complete. Login with owner@nairobilens.demo / Passw0rd!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
