import bcrypt from 'bcryptjs';
import { AccountRepo } from '../repositories/accountRepo.js';
import { ProductRepo } from '../repositories/productRepo.js';
import { CouponRepo } from '../repositories/couponRepo.js';
import { MessageRepo } from '../repositories/messageRepo.js';
import { CryptoService } from '../services/cryptoService.js';
import { Product, UserAccount } from '../types/index.js';

async function seed() {
  console.log('🌱 Seeding KanaShop initial data...');

  const passHash = await bcrypt.hash('password123', 12);

  // 1. Seed Accounts
  // Valid Thai ID numbers for test
  const adminThaiId = '1103701234568';
  const userThaiId = '1103702345674';

  const existingAdmin = await AccountRepo.findByUsername('admin');
  if (!existingAdmin) {
    const admin: UserAccount = {
      id: 'usr_admin001',
      role: 'admin',
      fullName: 'Kana Admin Master',
      email: 'admin@kanashop.com',
      phone: '0819998888',
      photoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      thaiId: {
        masked: CryptoService.maskThaiId(adminThaiId),
        cipher: CryptoService.encrypt(adminThaiId),
      },
      username: 'admin',
      passwordHash: passHash,
      status: 'active',
      suspendedUntil: null,
      banReason: null,
      preferences: { theme: 'light' },
      collectedCoupons: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordChangedAt: null,
      lastLoginAt: null,
    };
    await AccountRepo.create(admin);
    console.log('✅ Admin account seeded (username: admin / password: password123)');
  }

  const existingUser = await AccountRepo.findByUsername('somchai');
  if (!existingUser) {
    const user: UserAccount = {
      id: 'usr_somchai01',
      role: 'user',
      fullName: 'Somchai Jaidee',
      email: 'somchai@example.com',
      phone: '0812345678',
      photoUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
      thaiId: {
        masked: CryptoService.maskThaiId(userThaiId),
        cipher: CryptoService.encrypt(userThaiId),
      },
      username: 'somchai',
      passwordHash: passHash,
      status: 'active',
      suspendedUntil: null,
      banReason: null,
      preferences: { theme: 'light' },
      collectedCoupons: ['WELCOME10', 'SUMMER15'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      passwordChangedAt: null,
      lastLoginAt: null,
    };
    await AccountRepo.create(user);
    console.log('✅ Customer account seeded (username: somchai / password: password123)');
  }

  // 2. Seed Products (Licensed & Plain Design Taxonomy)
  const productsCount = (await ProductRepo.getAll(true)).length;
  if (productsCount === 0) {
    const sampleProducts: Product[] = [
      // 1. Licensed Designs -> Stainless Steel
      {
        id: 'prd_lic_ss_01',
        title: 'Studio Ghibli Edition — Totoro Forest Stainless Tumbler',
        description: 'Officially licensed Studio Ghibli thermal tumbler with double-wall vacuum insulation. Keeps drinks icy cold for 24h or steaming hot for 12h.',
        category: 'licensed',
        subcategory: 'stainless_steel',
        capacityOz: 30,
        price: 1290,
        stock: 85,
        salesVolume: 1420,
        images: [
          'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prd_lic_ss_02',
        title: 'Star Wars Mandalorian — Beskar Armor Steel Flask',
        description: 'Authentic Lucasfilm licensed textured finish inspired by pure Beskar steel. Spill-proof straw lid included.',
        category: 'licensed',
        subcategory: 'stainless_steel',
        capacityOz: 40,
        price: 1450,
        stock: 45,
        salesVolume: 1180,
        images: [
          'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // 2. Licensed Designs -> Ceramic
      {
        id: 'prd_lic_cer_01',
        title: 'Moomin Valley Nordic — Ceramic Lined Insulated Travel Mug',
        description: 'Pure ceramic interior prevents metallic aftertaste. Featuring classic Moomin illustrations with splash-resistant lid.',
        category: 'licensed',
        subcategory: 'ceramic',
        capacityOz: 20,
        price: 1190,
        stock: 60,
        salesVolume: 920,
        images: [
          'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prd_lic_cer_02',
        title: 'Sanrio Hello Kitty 50th Anniversary — Ceramic Thermal Mug',
        description: 'Collector edition double-walled ceramic insulated tumbler with pastel matte finish and brass gold accents.',
        category: 'licensed',
        subcategory: 'ceramic',
        capacityOz: 24,
        price: 1350,
        stock: 35,
        salesVolume: 850,
        images: [
          'https://images.unsplash.com/photo-1577937927133-66ef06acdf18?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // 3. Plain Designs -> Grade 304 Stainless Steel
      {
        id: 'prd_pln_304_01',
        title: 'Kana Classic 304 — Minimalist Sage Green Tumbler',
        description: 'Clean Scandinavian styling in food-grade SUS 304 stainless steel. Powder-coated sweat-free exterior with ergonomic handle.',
        category: 'plain',
        subcategory: 'ss304',
        capacityOz: 30,
        price: 790,
        stock: 120,
        salesVolume: 2150,
        images: [
          'https://images.unsplash.com/photo-1570857502809-08184874388e?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prd_pln_304_02',
        title: 'Kana Matte Black 304 — All-Day Hydro Flask',
        description: 'Timeless stealth matte black finish in Grade 304 steel. Wide mouth for easy ice filling and cleaning.',
        category: 'plain',
        subcategory: 'ss304',
        capacityOz: 32,
        price: 850,
        stock: 90,
        salesVolume: 1670,
        images: [
          'https://images.unsplash.com/photo-1527661591475-527312dd65f5?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      // 4. Plain Designs -> Grade 316 Stainless Steel
      {
        id: 'prd_pln_316_01',
        title: 'Kana Ultra 316 Marine Grade — Raw Brushed Silver Tumbler',
        description: 'Medical & marine grade SUS 316 stainless steel with molybdenum enhancement. Supreme acid & corrosion resistance for coffees, teas, and smoothies.',
        category: 'plain',
        subcategory: 'ss316',
        capacityOz: 40,
        price: 1150,
        stock: 75,
        salesVolume: 1890,
        images: [
          'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'prd_pln_316_02',
        title: 'Kana Executive 316 — Deep Ocean Navy Tumbler with Straw',
        description: 'Premium SUS 316 interior with triple insulation. Includes leak-proof 2-in-1 sip and straw lid.',
        category: 'plain',
        subcategory: 'ss316',
        capacityOz: 30,
        price: 1090,
        stock: 50,
        salesVolume: 1340,
        images: [
          'https://images.unsplash.com/photo-1536939459926-301728717817?auto=format&fit=crop&w=800&q=80',
        ],
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    for (const p of sampleProducts) {
      await ProductRepo.create(p);
    }
    console.log(`✅ Seeded ${sampleProducts.length} tumblers across all taxonomy categories`);
  }

  // 3. Seed Coupons
  const couponsCount = (await CouponRepo.getAll(true)).length;
  if (couponsCount === 0) {
    await CouponRepo.create({
      id: 'cpn_01',
      code: 'WELCOME10',
      title: 'New Member Welcome Discount',
      description: 'Get 10% off your first order on any premium tumbler.',
      type: 'percent',
      value: 10,
      minSpend: 500,
      maxDiscount: 200,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 1000,
      usedCount: 14,
      active: true,
    });

    await CouponRepo.create({
      id: 'cpn_02',
      code: 'SUMMER15',
      title: 'Summer Hydration Special',
      description: '15% discount for orders above ฿1,000.',
      type: 'percent',
      value: 15,
      minSpend: 1000,
      maxDiscount: 350,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 500,
      usedCount: 28,
      active: true,
    });

    await CouponRepo.create({
      id: 'cpn_03',
      code: 'KANA50',
      title: 'Instant ฿50 Off Voucher',
      description: 'Flat ฿50 discount on orders ฿400 and above.',
      type: 'fixed',
      value: 50,
      minSpend: 400,
      startsAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 800,
      usedCount: 52,
      active: true,
    });
    console.log('✅ Seeded coupons (WELCOME10, SUMMER15, KANA50)');
  }

  // 4. Seed Chat Message
  const messages = await MessageRepo.getMessages('usr_somchai01');
  if (messages.length === 0) {
    await MessageRepo.appendMessage('usr_somchai01', {
      id: 'msg_seed_01',
      sender: 'user',
      senderId: 'usr_somchai01',
      type: 'text',
      text: 'Hello KanaShop! Is the Studio Ghibli Totoro tumbler back in stock?',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      readByAdmin: true,
      readByUser: true,
    });
    await MessageRepo.appendMessage('usr_somchai01', {
      id: 'msg_seed_02',
      sender: 'admin',
      senderId: 'usr_admin001',
      type: 'text',
      text: 'Hi Somchai! Yes, we just restocked 85 units today with free insulated straw accessories. Let us know if you need assistance with ordering!',
      createdAt: new Date(Date.now() - 1800000).toISOString(),
      readByAdmin: true,
      readByUser: true,
    });
    console.log('✅ Seeded initial conversation thread in message_data');
  }

  console.log('✨ KanaShop seed completed successfully!\n');
}

seed().catch(console.error);
