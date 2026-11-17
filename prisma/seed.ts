/**
 * Demo seed: 4 offices, 33 members (invented), weekly menu, dated meals for today/tomorrow,
 * wallet history for the SUPER_ADMIN, and a handful of live orders so every page has data.
 *
 *   npm run db:seed          (wipes and reseeds the database)
 */
import { randomUUID } from "node:crypto";
import { PrismaClient, type AccountType, type LedgerType, type Slot } from "@prisma/client";

const prisma = new PrismaClient();

// ---- date helpers (Asia/Dhaka calendar days as YYYY-MM-DD) -----------------
const dhakaNow = () => new Date(Date.now() + 6 * 3600_000);
const dayStr = (offset: number) => new Date(dhakaNow().getTime() + offset * 86_400_000).toISOString().slice(0, 10);
const at = (offset: number, hour: number, minute = 0, second = 0) => {
  // Dhaka wall-clock time on (today + offset) → real Date
  const d = new Date(`${dayStr(offset)}T00:00:00Z`);
  return new Date(d.getTime() + (hour * 3600 + minute * 60 + second) * 1000 - 6 * 3600_000);
};

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@hfc.example";

async function main() {
  console.log("Wiping existing data…");
  await prisma.ledgerEntry.deleteMany();
  await prisma.order.deleteMany();
  await prisma.stockOut.deleteMany();
  await prisma.menuOption.deleteMany();
  await prisma.savedMeal.deleteMany();
  await prisma.dayOff.deleteMany();
  await prisma.officeManager.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
  await prisma.office.deleteMany();

  // ---- offices ----------------------------------------------------------
  const officeData = [
    { name: "Ambon Complex", address: "Ambon Complex, Dhaka 1212", lunchCutoff: "10:30", dinnerCutoff: "16:00" },
    { name: "Aparajita Hall", address: "Government Titumir College", lunchCutoff: "10:30", dinnerCutoff: "16:00" },
    { name: "Medona Tower", address: "Wireless Gate, Mohakhali, Dhaka-1212", lunchCutoff: "10:45", dinnerCutoff: "16:15" },
    { name: "Others", address: "Mohakhali Dhaka-1212", lunchCutoff: "11:00", dinnerCutoff: "16:30" },
  ];
  const offices: Record<string, string> = {};
  for (const [i, o] of officeData.entries()) {
    const created = await prisma.office.create({
      data: { ...o, createdAt: new Date(Date.now() - (10 - i) * 1000) },
    });
    offices[o.name] = created.id;
  }
  const AMBON = "Ambon Complex";
  const APARAJITA = "Aparajita Hall";
  const MEDONA = "Medona Tower";
  const OTHERS = "Others";

  // ---- members ----------------------------------------------------------
  type Seed = {
    name: string;
    office: string | null;
    floor: string;
    desk: string;
    type?: AccountType;
    balance?: number;
    banned?: boolean;
  };
  const people: Seed[] = [
    { name: "Ziaul Karim", office: AMBON, floor: "03", desk: "12T - SVA - MON 2159", balance: 0 },
    { name: "Hasan Mahmud", office: AMBON, floor: "15", desk: "065", balance: 0 },
    { name: "Shahriar Rashid", office: AMBON, floor: "3", desk: "A-21", balance: -1200 },
    { name: "Fahim Kabir", office: AMBON, floor: "3rd", desk: "D-14", balance: 0 },
    { name: "Mahfuza Rahman", office: AMBON, floor: "6", desk: "B-07", balance: -980 },
    { name: "Parvez Ahmed", office: AMBON, floor: "2", desk: "C-03", balance: 450 },
    { name: "Sayeed Asif", office: AMBON, floor: "15", desk: "ST-11", balance: -850 },
    { name: "Samira Islam", office: AMBON, floor: "3", desk: "A-02", balance: 0 },
    { name: "Imtiaz Alam", office: AMBON, floor: "03", desk: "E-33", balance: -750 },
    { name: "Mahedi Shikder", office: AMBON, floor: "6", desk: "B-19", balance: 300 },
    { name: "Jihad Hossain", office: AMBON, floor: "2", desk: "C-12", balance: -700 },
    { name: "Mohammad Sufiyan", office: AMBON, floor: "15", desk: "070", balance: 0 },
    { name: "Dewan Hossain", office: AMBON, floor: "3rd", desk: "D-02", balance: -650 },
    { name: "Sumon Mollah", office: AMBON, floor: "6", desk: "B-30", balance: 1500 },
    { name: "Hasan Razib", office: APARAJITA, floor: "2", desk: "H-1", balance: 0 },
    { name: "Fazle Amin", office: APARAJITA, floor: "3", desk: "H-9", balance: -600 },
    { name: "Zarif Hasan", office: APARAJITA, floor: "03", desk: "H-12", balance: 0 },
    { name: "Shamim Hossain", office: APARAJITA, floor: "2", desk: "H-3", type: "ONE_TIME", balance: 0 },
    { name: "Ayesha Siddique", office: APARAJITA, floor: "3", desk: "H-15", balance: -540 },
    { name: "Bayazid Ahmed", office: MEDONA, floor: "7", desk: "M-101", balance: 0 },
    { name: "Khalid Hasan", office: MEDONA, floor: "7", desk: "M-102", balance: -450 },
    { name: "Sajib Das", office: MEDONA, floor: "15", desk: "M-410", balance: 200 },
    { name: "Wasim Ali", office: MEDONA, floor: "6", desk: "M-77", type: "ONE_TIME", balance: 0 },
    { name: "Md. Rasel", office: MEDONA, floor: "7", desk: "M-120", balance: -400 },
    { name: "Mukhlish Habib", office: MEDONA, floor: "6", desk: "M-81", balance: 0 },
    { name: "Adnan Karim", office: OTHERS, floor: "2", desk: "O-4", balance: -250 },
    { name: "Alo Uddin", office: OTHERS, floor: "3", desk: "O-8", type: "ONE_TIME", balance: 0 },
    { name: "Jihadul Islam", office: OTHERS, floor: "3", desk: "O-9", balance: -200 },
    { name: "Rasel Sarker", office: null, floor: "", desk: "", balance: 0 },
    { name: "Banned Example", office: AMBON, floor: "2", desk: "Z-1", balance: 0, banned: true },
  ];

  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  const users: Record<string, string> = {};
  let emp = 15000;

  const admin = await prisma.user.create({
    data: {
      name: "Imran",
      email: ADMIN_EMAIL,
      role: "SUPER_ADMIN",
      employeeId: "15306",
      phone: "01700000001",
      building: MEDONA,
      floor: "7",
      desk: "Mac 2014",
      address: "Medona Tower, 7th floor",
      zoneId: offices[MEDONA],
      balance: -300,
      emailVerified: new Date(),
    },
  });
  const catering = await prisma.user.create({
    data: {
      name: "HomeFlavour Catering",
      email: "catering@hfc.example",
      role: "SUPER_ADMIN",
      employeeId: "HFC-ADMIN",
      phone: "01700000002",
      building: AMBON,
      floor: "2",
      desk: "Kitchen",
      address: "Ambon Complex, Dhaka 1212",
      zoneId: offices[AMBON],
      emailVerified: new Date(),
    },
  });
  await prisma.officeManager.create({ data: { officeId: offices[AMBON], userId: catering.id } });

  for (const p of people) {
    emp += 37 + (p.name.length % 7);
    const u = await prisma.user.create({
      data: {
        name: p.name,
        email: `${slug(p.name)}@hfc.example`,
        employeeId: String(emp),
        phone: p.office ? `017${String(10000000 + emp * 13).slice(0, 8)}` : null,
        building: p.office,
        floor: p.floor || null,
        desk: p.desk || null,
        address: p.office ? `${p.office}${p.floor ? `, floor ${p.floor}` : ""}` : null,
        zoneId: p.office ? offices[p.office] : null,
        accountType: p.type ?? "REGULAR",
        banned: p.banned ?? false,
        balance: p.balance ?? 0,
        emailVerified: new Date(),
      },
    });
    users[p.name] = u.id;
    if (p.balance) {
      await prisma.ledgerEntry.create({
        data: { userId: u.id, type: "ADJUSTMENT", amount: p.balance, balanceAfter: p.balance, note: "Opening balance (seed)", createdById: catering.id, createdAt: at(-40, 11) },
      });
    }
  }
  // Demo office manager (Aparajita Hall)
  const manager = await prisma.user.create({
    data: {
      name: "Farhana Akter",
      email: "farhana.akter@hfc.example",
      employeeId: "15999",
      phone: "01711111111",
      building: APARAJITA,
      floor: "2",
      desk: "Admin desk",
      address: "Aparajita Hall",
      zoneId: offices[APARAJITA],
      emailVerified: new Date(),
    },
  });
  await prisma.officeManager.create({ data: { officeId: offices[APARAJITA], userId: manager.id } });

  // ---- menu: weekly templates (Sun=0 … Sat=6) ------------------------------
  const weekly: { weekday: number; slot: Slot; title: string; description?: string; price: number; maxQuantity?: number }[] = [
    { weekday: 0, slot: "LUNCH", title: "Chicken Curry", description: "ভাত + চিকেন + সবজি + ডাল", price: 100 },
    { weekday: 0, slot: "LUNCH", title: "Fish Curry", description: "Rice, fish curry, vegetables and dal", price: 90, maxQuantity: 20 },
    { weekday: 1, slot: "LUNCH", title: "Chicken Curry", description: "Rice, chicken curry, vegetables and dal", price: 120, maxQuantity: 20 },
    { weekday: 1, slot: "LUNCH", title: "Fish Curry", description: "Rice, fish curry, vegetables and dal", price: 100, maxQuantity: 12 },
    { weekday: 1, slot: "DINNER", title: "Beef Polao", description: "Fragrant polao with tender beef", price: 150, maxQuantity: 12 },
    { weekday: 2, slot: "LUNCH", title: "Fish Curry", description: "Rice, fish curry, vegetables and dal", price: 100 },
    { weekday: 2, slot: "LUNCH", title: "Chicken Curry", description: "Rice, chicken curry, vegetables and dal", price: 100 },
    { weekday: 3, slot: "LUNCH", title: "Chicken Curry", description: "Rice, chicken curry, vegetables and dal", price: 100 },
    { weekday: 3, slot: "LUNCH", title: "Egg Curry", description: "Rice, egg curry, vegetables and dal", price: 80 },
    { weekday: 5, slot: "LUNCH", title: "Beef Curry", description: "Rice, beef curry, vegetables and dal", price: 160 },
    { weekday: 5, slot: "LUNCH", title: "Egg Curry", description: "Rice, egg curry, vegetables and dal", price: 80 },
    { weekday: 6, slot: "LUNCH", title: "Chicken Biryani", description: "Basmati rice, potato, boiled egg, salad.", price: 180, maxQuantity: 15 },
    { weekday: 6, slot: "DINNER", title: "Morog Polao", description: "Chicken polao with salad", price: 140 },
  ];
  for (const w of weekly) {
    const groupId = randomUUID();
    await prisma.menuOption.createMany({
      data: Object.values(offices).map((officeId) => ({
        ...w,
        description: w.description ?? null,
        maxQuantity: w.maxQuantity ?? null,
        officeId,
        groupId,
      })),
    });
  }

  // ---- menu: dated meals so today/tomorrow are demoable ---------------------
  const dated: { off: number; slot: Slot; title: string; description: string; price: number; maxQuantity?: number }[] = [
    { off: 0, slot: "LUNCH", title: "Chicken Biryani + Salad", description: "Fragrant basmati rice with spiced chicken", price: 180, maxQuantity: 12 },
    { off: 0, slot: "LUNCH", title: "Beef Bhuna + Rice", description: "White rice with beef bhuna and dal", price: 160 },
    { off: 0, slot: "DINNER", title: "Khichuri + Beguni", description: "Comfort khichuri set with beguni", price: 140 },
    { off: 1, slot: "LUNCH", title: "Polao + Chicken Roast", description: "Ghee polao with chicken roast and salad", price: 200 },
    { off: 1, slot: "LUNCH", title: "Rui Fish Curry", description: "Rice with rui fish curry and dal", price: 130 },
    { off: 1, slot: "DINNER", title: "Kacchi Biryani", description: "Traditional mutton kacchi with potato", price: 220 },
    { off: 2, slot: "LUNCH", title: "Chicken Curry", description: "Rice, chicken curry, vegetables and dal", price: 100 },
  ];
  const optionIds: Record<string, string> = {}; // `${office}|${off}|${slot}|${index}` → id
  for (const [idx, d] of dated.entries()) {
    const groupId = randomUUID();
    for (const [name, officeId] of Object.entries(offices)) {
      const created = await prisma.menuOption.create({
        data: { officeId, groupId, slot: d.slot, date: dayStr(d.off), title: d.title, description: d.description, price: d.price, maxQuantity: d.maxQuantity ?? null },
      });
      optionIds[`${name}|${idx}`] = created.id;
    }
  }

  // ---- saved meals (11 archived, none active — matches the empty state) -----
  const archived = [
    ["Bhat + Beef Bhuna", "White rice with beef bhuna and dal", 180],
    ["Hilsa Fish Curry", "Steamed rice with Rui/Ilish-style curry (seasonal)", 250],
    ["Chicken", "ভাত+চিকেন কারি+আলু+ডাল", 100],
    ["Chicken Biryani", "Fragrant basmati rice with spiced chicken", 180],
    ["Chicken Curry", "ভাত + চিকেন কারি + আলু ভর্তা + ডাল", 100],
    ["Kacchi Biryani", "Traditional mutton kacchi with potato", 220],
    ["Khichuri + Beguni", "Comfort khichuri set with beguni", 140],
    ["Polao + Chicken Roast", "Ghee polao with chicken roast and salad", 200],
    ["Rice with chicken curry", null, 160],
    ["চিকেন বিরিয়ানি + সালাদ", null, 130],
    ["ভাত + চিকেন কারি + সবজি + ডাল", null, 100],
  ] as const;
  for (const [i, [title, description, price]] of archived.entries()) {
    await prisma.savedMeal.create({ data: { title, description, price, archived: true, createdAt: new Date(Date.now() - i * 1000) } });
  }

  // ---- Imran's wallet history (mirrors the reference account) ---------------
  // 18 live orders (10×৳100, 5×৳140, 2×৳90, 1×৳150 = ৳2,030) + 1 cancelled; due payments ৳970 + ৳760
  const history: { title: string; amount: number; ago: number; phone?: boolean; cancelled?: boolean }[] = [
    { title: "Fish Curry", amount: 100, ago: 21 },
    { title: "Chicken Curry", amount: 100, ago: 28, phone: true },
    { title: "Chicken Curry", amount: 100, ago: 31 },
    { title: "Fish Curry", amount: 100, ago: 38, phone: true },
    { title: "Chicken Curry", amount: 100, ago: 42 },
    { title: "Fish Curry", amount: 90, ago: 40 },
    { title: "Special Fish Curry", amount: 100, ago: 41 },
    { title: "Beef Curry", amount: 150, ago: 41, cancelled: true },
    { title: "Special Fish Curry", amount: 100, ago: 45 },
    { title: "Beef Polao", amount: 140, ago: 47, phone: true },
    { title: "Fish Curry", amount: 100, ago: 52 },
    { title: "Chicken Curry", amount: 100, ago: 55, phone: true },
    { title: "Fish Curry", amount: 90, ago: 56 },
    { title: "Chicken Curry", amount: 100, ago: 59, phone: true },
    { title: "Veg + Beef", amount: 150, ago: 60 },
    { title: "Chicken Curry", amount: 100, ago: 62, phone: true },
    { title: "Chicken Curry", amount: 100, ago: 64, phone: true },
    { title: "Beef Polao", amount: 140, ago: 70 },
    { title: "Beef Polao", amount: 140, ago: 73 },
  ];
  // normalise so there are exactly ten ৳100 / five ৳140 / two ৳90 / one ৳150 live orders
  const live = history.filter((h) => !h.cancelled);
  const target = [...Array(10).fill(100), ...Array(5).fill(140), ...Array(2).fill(90), 150];
  live.sort((a, b) => a.ago - b.ago).forEach((h, i) => (h.amount = target[i % target.length]));
  for (const h of history) {
    const mealDate = dayStr(-h.ago);
    await prisma.order.create({
      data: {
        userId: admin.id,
        officeId: offices[AMBON],
        slot: "LUNCH",
        mealDate,
        title: h.title,
        unitPrice: h.amount,
        quantity: 1,
        amount: h.amount,
        status: h.cancelled ? "CANCELLED" : "DELIVERED",
        paymentStatus: h.cancelled ? "UNPAID" : "WALLET_CHARGED",
        note: h.phone ? "Phone order" : null,
        placedById: h.phone ? catering.id : null,
        createdAt: at(-h.ago, 10, 2 + (h.ago % 50), 10),
        deliveredAt: h.cancelled ? null : at(-h.ago, 13, 31, 20),
        cancelledAt: h.cancelled ? at(-h.ago, 11, 5) : null,
      },
    });
  }
  let bal = -2030;
  for (const [amount, ago, note] of [
    [970, 36, null],
    [760, 12, "Bkash payment"],
  ] as [number, number, string | null][]) {
    bal += amount;
    await prisma.ledgerEntry.create({
      data: { userId: admin.id, type: "DUE_PAYMENT" as LedgerType, amount, balanceAfter: bal + (ago === 36 ? 0 : 0), note, createdById: catering.id, createdAt: at(-ago, 13, 30, 7) },
    });
  }

  // ---- today's & tomorrow's live orders -------------------------------------
  const mk = async (
    who: string,
    off: number,
    idx: number,
    qty: number,
    status: "PENDING" | "DELIVERED" | "CANCELLED",
    pay: "UNPAID" | "WALLET_CHARGED" | "CASH_PAID" | "DUE" = "UNPAID",
    note?: string,
  ) => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: users[who] } });
    const opt = await prisma.menuOption.findUniqueOrThrow({ where: { id: optionIds[`${user.building}|${idx}`] } });
    await prisma.order.create({
      data: {
        userId: user.id,
        officeId: opt.officeId,
        optionId: opt.id,
        slot: opt.slot,
        mealDate: dayStr(off),
        title: opt.title,
        unitPrice: opt.price,
        quantity: qty,
        amount: opt.price * qty,
        status,
        paymentStatus: pay,
        note: note ?? null,
        placedById: note === "Phone order" ? catering.id : null,
        createdAt: at(off, 9, 15),
        deliveredAt: status === "DELIVERED" ? at(off, 13, 5) : null,
        cancelledAt: status === "CANCELLED" ? at(off, 9, 40) : null,
      },
    });
  };
  await mk("Ziaul Karim", 0, 0, 1, "DELIVERED", "WALLET_CHARGED");
  await mk("Hasan Mahmud", 0, 1, 2, "PENDING");
  await mk("Shahriar Rashid", 0, 0, 1, "PENDING");
  await mk("Fahim Kabir", 0, 2, 1, "PENDING", "UNPAID", "Phone order");
  await mk("Mahfuza Rahman", 0, 0, 1, "CANCELLED");
  await mk("Parvez Ahmed", 0, 1, 1, "DELIVERED", "WALLET_CHARGED");
  await mk("Hasan Razib", 0, 0, 1, "PENDING");
  await mk("Shamim Hossain", 0, 1, 1, "DELIVERED", "UNPAID");
  await mk("Bayazid Ahmed", 0, 0, 1, "PENDING");
  await mk("Khalid Hasan", 0, 2, 1, "PENDING");
  await mk("Wasim Ali", 0, 0, 1, "DELIVERED", "DUE");
  await mk("Alo Uddin", 0, 1, 1, "PENDING");
  await mk("Sumon Mollah", 1, 3, 1, "PENDING");
  await mk("Samira Islam", 1, 4, 2, "PENDING");

  // one stocked-out dish for today (restock it from Menu → Live)
  await prisma.stockOut.create({ data: { optionId: optionIds[`${AMBON}|1`], date: dayStr(0) } });

  console.log(`Seeded. SUPER_ADMIN: ${ADMIN_EMAIL}  (dev login lists every seeded user)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
