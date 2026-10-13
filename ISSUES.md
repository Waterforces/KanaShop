# 📋 รายการปัญหาและข้อบกพร่องทั้งหมดของระบบ KanaShop (All Identified Issues)

เอกสารฉบับนี้รวบรวมปัญหา ข้อบกพร่อง ช่องโหว่ความปลอดภัย และจุดบกพร่องด้าน UX/UI ทั้งหมดที่ตรวจพบจากการตรวจสอบโค้ดอย่างละเอียด (Code & UX Audit) ทั้งฝั่ง **Backend (Node.js/Express)** และ **Frontend (React/Vite)**

---

## 📑 สารบัญ (Table of Contents)
1. [หมวดที่ 1: ช่องโหว่ความปลอดภัยระดับร้ายแรง (Security Vulnerabilities - P0)](#หมวดที่-1-ช่องโหว่ความปลอดภัยระดับร้ายแรง-security-vulnerabilities---p0)
2. [หมวดที่ 2: ปัญหา Business Logic และความถูกต้องของข้อมูล (Data Integrity - P1)](#หมวดที่-2-ปัญหา-business-logic-และความถูกต้องของข้อมูล-data-integrity---p1)
3. [หมวดที่ 3: ปัญหาด้าน Architecture, Code Quality & Maintainability (P2)](#หมวดที่-3-ปัญหาด้าน-architecture-code-quality--maintainability-p2)
4. [หมวดที่ 4: ปัญหาด้าน UX/UI และ User Experience (P2 - P3)](#หมวดที่-4-ปัญหาด้าน-uxui-และ-user-experience-p2---p3)
5. [หมวดที่ 5: ปัญหาจากมุมมอง User Journey (New User & Old User)](#หมวดที่-5-ปัญหาจากมุมมอง-user-journey-new-user--old-user)
6. [สรุป Action Plan และลำดับความสำคัญในการแก้ไข](#สรุป-action-plan-และลำดับความสำคัญในการแก้ไข)

---

## หมวดที่ 1: ช่องโหว่ความปลอดภัยระดับร้ายแรง (Security Vulnerabilities - P0)

### 🔴 1.1 รหัสผ่านชั่วคราวรั่วไหลใน Response (Account Takeover Vulnerability)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/authRoutes.ts` บรรทัดที่ 287-292](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/authRoutes.ts#L287-L292)
  - Frontend: [`Frontend/src/pages/auth/ForgotPasswordPage.tsx` บรรทัดที่ 70-75](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/auth/ForgotPasswordPage.tsx#L70-L75)
- **รายละเอียดปัญหา:**
  ใน Endpoint `/api/auth/forgot/send` ฝั่ง Backend มีการแนบฟิลด์ `devPasscode: gen.code` ส่งกลับไปใน JSON Response ให้กับ Client และหน้า Frontend ทำการ auto-fill รหัสนี้ลงในช่องทันที
- **ผลกระทบ:**
  ผู้ไม่ประสงค์ดีสามารถกรอกอีเมลของใครก็ได้ (รวมถึงบัญชีผู้ดูแลระบบ `admin`) แล้วกดขอรหัสผ่าน ระบบจะส่งรหัสลับ 6 หลักกลับมาใน Network Tab ทันที ทำให้สามารถ Reset รหัสผ่านและยึดบัญชี (Account Takeover) ได้ 100%
- **แนวทางแก้ไข:**
  - นำฟิลด์ `devPasscode` ออกจาก API Response ทันที
  - ส่งรหัสผ่านทางอีเมลจริง (เช่น ผ่าน Nodemailer / SendGrid / Resend) หรือหากอยู่ใน Dev Mode ให้แสดงผลเฉพาะใน Terminal Log เท่านั้น

---

### 🔴 1.2 ไม่มีการตรวจสอบจำนวนสินค้า (`qty`) ทำให้เกิดช่องโหว่ติดลบ (Negative Quantity Exploit)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 42-65](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L42-L65)
- **รายละเอียดปัญหา:**
  ตอนสั่งซื้อสินค้า (`POST /api/orders`) มีการรับ `item.qty` จาก Client โดยไม่มีการตรวจสอบว่าเป็นจำนวนเต็มบวก (`qty > 0` และ `Number.isInteger(qty)`) หรือไม่
- **ผลกระทบ:**
  1. ผู้โจมตีสามารถยิง Request โดยใส่ `qty: -5` ทำให้ยอดรวมคำนวณราคาติดลบ เพื่อหักลบกับสินค้าชิ้นอื่น ทำให้ซื้อของได้ในราคาถูกผิดปกติหรือ 0 บาท
  2. เมื่อคำสั่งซื้อผ่าน ฟังก์ชัน `ProductRepo.recordSales` จะนำ `stock - qty` กลายเป็น `stock - (-5) = stock + 5` ทำให้สต็อกสินค้าเพิ่มขึ้นเอง
- **แนวทางแก้ไข:**
  ใช้ Zod Validate ตรวจสอบ Request Body ให้แน่ชัดว่า `qty: z.number().int().positive()`

---

### 🔴 1.3 ระบบชำระเงินให้ Client ยืนยันสถานะเอง (Self-Confirmed Payment)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 182-214](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L182-L214)
- **รายละเอียดปัญหา:**
  Endpoint `/api/orders/:id/mark-paid` อนุญาตให้ผู้ซื้อกดยืนยันว่า "ฉันโอนเงินแล้ว" และระบบจะปรับสถานะออเดอร์เป็น `PAID` ทันที โดยไม่มีการตรวจสอบสลิปโอนเงิน (Slip Verification API) หรือ Payment Gateway Webhook
- **ผลกระทบ:**
  ผู้ซื้อสามารถกดสั่งซื้อแบบ PromptPay แล้วกดยืนยันการชำระเงินทันทีโดยไม่ได้โอนเงินจริง สินค้าจะถูกตัดสต็อกและขึ้นสถานะพร้อมแพ็กส่ง
- **แนวทางแก้ไข:**
  - ปรับสถานะเป็น `WAITING_VERIFICATION` และบังคับให้อัปโหลดสลิปโอนเงิน เพื่อให้ Admin ตรวจสอบก่อนปรับเป็น `PAID`
  - หรือต่อระบบตรวจสลิปอัตโนมัติ (เช่น EasySlip / SlipOK API)

---

### 🔴 1.4 การอัปโหลดไฟล์ไม่ปลอดภัย เสี่ยงต่อ Stored XSS / Malicious Upload
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/middleware/upload.ts` บรรทัดที่ 16-34](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/middleware/upload.ts#L16-L34)
  - Frontend Proxy: [`Frontend/vite.config.ts`](file:///c:/Coding/Mini_Project/KanaShop/Frontend/vite.config.ts)
- **รายละเอียดปัญหา:**
  1. Multer ตรวจสอบชนิดไฟล์จาก `file.mimetype` ที่ส่งมาจาก Client ซึ่งปลอมแปลงได้ง่าย (Spoofable)
  2. ดึงนามสกุลไฟล์โดยตรงจาก `path.extname(file.originalname)`
  3. โฟลเดอร์ `/uploads` ถูกเสิร์ฟแบบ Static และใน Vite Dev Server มีการทำ Proxy `/uploads` ให้อยู่ภายใต้ Origin เดียวกับแอป React (`localhost:5173`)
- **ผลกระทบ:**
  ผู้โจมตีสามารถอัปโหลดไฟล์ HTML/SVG ที่ฝัง JavaScript แล้วตั้งชื่อหลอกเป็นรูปภาพ เมื่อเปิดดูไฟล์ผ่าน URL จะเกิด Stored XSS บน Origin ของระบบ สามารถขโมย Session Cookie หรือยึด Token ได้
- **แนวทางแก้ไข:**
  - ตรวจสอบ Magic Bytes (File Signature) ของเนื้อหาไฟล์จริง
  - สุ่มสร้างชื่อไฟล์และบังคับนามสกุลไฟล์ที่ปลอดภัย (Whitelist เช่น `.jpg`, `.png`, `.webp`)
  - กำหนด Response Header `Content-Disposition: inline` และ `X-Content-Type-Options: nosniff`

---

### 🔴 1.5 มีการ Hardcode ค่า Default Secrets ในโค้ด (Predictable Fallback Secrets)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/config/env.ts` บรรทัดที่ 8-9](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/config/env.ts#L8-L9)
- **รายละเอียดปัญหา:**
  มีการใส่ค่า Hardcoded Fallback สำหรับ `JWT_SECRET` และ `ENCRYPTION_KEY` (AES-256) ไว้ในโค้ด หากไม่มีการตั้งค่า `.env`
- **ผลกระทบ:**
  หากนำโค้ดขึ้น Production โดยไม่ได้ตั้งค่า Environment Variables ผู้โจมตีจะสามารถสร้าง JWT ปลอมในฐานะ `role: 'admin'` และสามารถถอดรหัสเลขบัตรประชาชน (Thai National ID) ของผู้ใช้งานทุกคนในระบบได้ทันที
- **แนวทางแก้ไข:**
  บังคับให้โยน Error (Throw Error / Process Exit) ทันทีตอนเริ่มเซิร์ฟเวอร์ หากไม่พบ Environment Variables เหล่านี้ในโหมด Production

---

### 🔴 1.6 ขาดระบบ Rate Limiting และเสี่ยงต่อ CPU DoS จากการวนลูป Decrypt
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/authRoutes.ts` บรรทัดที่ 58-79](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/authRoutes.ts#L58-L79)
- **รายละเอียดปัญหา:**
  1. ไม่มี Middleware จำกัดจำนวนครั้งในการส่ง Request (Rate Limiter) ในหน้า Login, Register, และ Forgot Password
  2. ในขั้นตอนสมัครสมาชิก มีการตรวจสอบความซ้ำของเลขบัตรประชาชน โดยการอ่าน User ทุกคนในระบบและเรียก `CryptoService.decrypt()` ทุกรายการในหน่วยความจำ
- **ผลกระทบ:**
  - เสี่ยงต่อการโจมตีแบบ Brute Force รหัสผ่าน
  - ผู้โจมตีสามารถยิง Request สมัครสมาชิกรัวๆ เพื่อบังคับให้ CPU ถอดรหัส AES วนลูปซ้ำๆ จนเกิด Denial of Service (DoS)
- **แนวทางแก้ไข:**
  - ติดตั้ง `express-rate-limit`
  - ทำ Hash แบบ Deterministic (เช่น HMAC-SHA256 ด้วย Secret Key) แยกไว้เป็นฟิลด์สำหรับค้นหา (Search Index) เพื่อเช็คความซ้ำโดยไม่ต้อง Decrypt ทั้งฐานข้อมูล

---

### 🔴 1.7 ส่งข้อมูลบัตรเครดิตดิบเข้า Backend (PCI-DSS Compliance Issue)
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/components/cart/CheckoutModal.tsx` บรรทัดที่ 104](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/components/cart/CheckoutModal.tsx#L104)
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 95-101](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L95-L101)
- **รายละเอียดปัญหา:**
  Frontend ส่งหมายเลขบัตรเครดิต, วันหมดอายุ, และ CVV เข้า Backend ของตนเองโดยตรง
- **ผลกระทบ:**
  ผิดมาตรฐานความปลอดภัยข้อมูลบัตรชำระเงิน (PCI-DSS) และเสี่ยงต่อการถูกดักจับข้อมูลระหว่างทาง
- **แนวทางแก้ไข:**
  หากเปิดใช้การชำระเงินด้วยบัตร ต้องใช้ SDK/Iframe Tokenization ของ Payment Gateway (เช่น Stripe, Omise, 2C2P) โดยตรงจาก Frontend

---

## หมวดที่ 2: ปัญหา Business Logic และความถูกต้องของข้อมูล (Data Integrity - P1)

### 🟠 2.1 Race Condition ในการตัดสต็อกสินค้า (Overselling Concurrency Bug)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 48-51](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L48-L51)
  - Backend: [`Backend/src/repositories/productRepo.ts` บรรทัดที่ 112-128](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/repositories/productRepo.ts#L112-L128)
- **รายละเอียดปัญหา:**
  ขั้นตอนการเช็คสต็อก (`product.stock < item.qty`) เกิดขึ้นใน `orderRoutes.ts` นอก Mutex Lock แต่ขั้นตอนการตัดสต็อกจริง (`ProductRepo.recordSales`) แยกทำงานอีกรอบใน Mutex ภายหลัง นอกจากนี้ใน `productRepo.ts` มีการใช้ `Math.max(0, product.stock - item.qty)` ซึ่งเป็นการกลบปัญหาแทนที่จะ Reject
- **ผลกระทบ:**
  หากมีผู้ใช้งาน 2 คนสั่งซื้อสินค้าชิ้นสุดท้ายพร้อมกัน (Concurrent Requests) ทั้งสองคนจะผ่านเงื่อนไขเช็คสต็อกทั้งคู่ ทำให้สินค้าถูกขายเกินจำนวนจริง (Overselling)
- **แนวทางแก้ไข:**
  ยุบขั้นตอน "ตรวจสอบสต็อก" และ "ตัดสต็อก" ให้อยู่ใน Transaction/Mutex Lock เดียวกันแบบ Atomic หากสต็อกไม่พอต้อง Reject ทันที

---

### 🟠 2.2 ปัญหาการใช้งานคูปองส่วนลด (Coupon Logic Vulnerabilities)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/repositories/couponRepo.ts` บรรทัดที่ 36-89](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/repositories/couponRepo.ts#L36-L89)
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 71-78](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L71-L78)
- **รายละเอียดปัญหา:**
  1. **ไม่จำกัดสิทธิ์ต่อคน (No Per-user Limit):** ผู้ใช้ 1 คนสามารถใช้คูปองเดิมซ้ำกี่ออเดอร์ก็ได้
  2. **ปุ่ม Collect คูปองไม่มีผลจริง:** ใน `orderRoutes.ts` มีการตรวจสอบแค่ว่าคูปองมีอยู่ในระบบหรือไม่ โดยไม่ตรวจสอบว่า User ผู้นั้นมีคูปองอยู่ใน `collectedCoupons` หรือไม่
  3. **ไม่มีการคืนสิทธิ์คูปอง (No Coupon Rollback):** หากคำสั่งซื้อถูกยกเลิก (`CANCELLED`) ยอด `usedCount` ของคูปองจะไม่ถูกคืนค่ากลับ
- **แนวทางแก้ไข:**
  - เช็ค `user.collectedCoupons.includes(couponCode)`
  - เพิ่มตาราง/รายการบันทึกประวัติการใช้คูปองของแต่ละ User (`usedCouponHistory`)
  - คืนสิทธิ์การใช้คูปองเมื่อออเดอร์ถูกยกเลิก

---

### 🟠 2.3 State Machine ของคำสั่งซื้อไม่รัดกุม และสต็อกไม่คืนเมื่อ Admin สั่งยกเลิก
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 239-250](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L239-L250) (User Cancel)
  - Backend: [`Backend/src/routes/orderRoutes.ts` บรรทัดที่ 329-369](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts#L329-L369) (Admin Status Update)
- **รายละเอียดปัญหา:**
  1. เมื่อ User กดยกเลิกออเดอร์ (`/cancel`) มีโค้ดเรียก `ProductRepo.restoreStock` เพื่อคืนสต็อก แต่เมื่อ **Admin** เปลี่ยนสถานะเป็น `CANCELLED` หรือ `REJECTED` ผ่าน Endpoint `/admin/:id/status` กลับไม่มีการคืนสต็อกสินค้า
  2. Admin สามารถเปลี่ยนสถานะข้ามไปมาอย่างไร้การควบคุม (เช่น เปลี่ยนจาก `COMPLETED` ถอยหลังกลับไปเป็น `PENDING_PAYMENT`)
- **แนวทางแก้ไข:**
  สร้าง State Transition Guard ที่ชัดเจน (กำหนดสถานะถัดไปที่ยอมรับได้) และผูกฟังก์ชันคืนสต็อกเข้ากับ Transition ไปยัง `CANCELLED` หรือ `REJECTED` เสมอ

---

### 🟠 2.4 คำสั่งซื้อ `PENDING_PAYMENT` ค้างในระบบตลอดกาล (No Expiry / Stock Hoarding)
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/components/cart/CheckoutModal.tsx` บรรทัดที่ 67-74](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/components/cart/CheckoutModal.tsx#L67-L74)
  - Backend: [`Backend/src/routes/orderRoutes.ts`](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/orderRoutes.ts)
- **รายละเอียดปัญหา:**
  ในหน้า Frontend มีตัวนับถอยหลัง PromptPay QR 15 นาที แต่เมื่อหมดเวลา 15 นาที ฝั่ง Backend ไม่มี Background Job หรือ Timer ในการยกเลิกออเดอร์ที่ค้างจ่าย
- **ผลกระทบ:**
  สต็อกสินค้าถูกตัดจองไปแล้ว หากผู้ใช้เปิดหน้าต่างทิ้งไว้หรือไม่จ่ายเงิน สต็อกจะหายไปจากระบบอย่างถาวรจนกว่า Admin จะเข้ามาตรวจเจอ
- **แนวทางแก้ไข:**
  เพิ่ม Cron Job หรือ Background Task ตรวจสอบออเดอร์ที่เป็น `PENDING_PAYMENT` เกิน 15-30 นาที แล้วปรับสถานะเป็น `EXPIRED/CANCELLED` พร้อมคืนสต็อกอัตโนมัติ

---

### 🟠 2.5 ปัญหา Socket Authentication & Authorization ในระบบแชท
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/sockets/chatSocket.ts` บรรทัดที่ 29-33, 106-115](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/sockets/chatSocket.ts#L29-L33)
- **รายละเอียดปัญหา:**
  1. ใน Socket Handshake มีการตรวจสถานะ `banned` แต่ **ไม่ได้ตรวจสถานะ `suspended`** และไม่ได้ตรวจว่าโทเค็นหมดอายุเนื่องจากเปลี่ยนรหัสผ่าน (`passwordChangedAt`) หรือไม่
  2. อีเวนต์ `chat:read` รับ `data.userId` ตรงๆ จาก Client โดยไม่ตรวจสอบสิทธิ์ ทำให้ User ทั่วไปสามารถส่ง ID ของ User คนอื่นเพื่อ Mark ข้อความของคนอื่นว่าอ่านแล้วได้
- **แนวทางแก้ไข:**
  - นำตรรกะตรวจเช็คความถูกต้องของ User ใน Middleware มาใช้กับ Socket Connection ให้ครบถ้วน
  - ใน `chat:read` ให้ดึง `userId` จาก `socket.data.user.id` โดยตรงหากผู้ส่งไม่ใช่ Admin

---

### 🟠 2.6 ข้อมูลรั่วไหลจากการตรวจสอบสถานะบัญชีก่อนรหัสผ่าน (Account Enumeration)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/authRoutes.ts` บรรทัดที่ 148-176](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/authRoutes.ts#L148-L176)
- **รายละเอียดปัญหา:**
  ขั้นตอน Login ตรวจสอบสถานะ `banned` หรือ `suspended` ก่อนที่จะทำการตรวจสอบรหัสผ่านด้วย `bcrypt.compare()`
- **ผลกระทบ:**
  ผู้ไม่ประสงค์ดีสามารถสุ่ม Username/Email เพื่อเช็คได้ว่าบัญชีเป้าหมายมีอยู่จริงและถูกแบนหรือไม่ โดยไม่ต้องรู้รหัสผ่าน
- **แนวทางแก้ไข:**
  ต้องตรวจสอบความถูกต้องของรหัสผ่านให้ผ่านก่อนเสมอ จึงค่อยตรวจสอบสถานะการถูกระงับของบัญชี

---

### 🟠 2.7 ช่องโหว่ Mass Assignment ในการแก้ไขสินค้าของ Admin
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/routes/productRoutes.ts` บรรทัดที่ 143-156](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/routes/productRoutes.ts#L143-L156)
- **รายละเอียดปัญหา:**
  การอัปเดตสินค้าใช้ `const updates = { ...req.body };` โดยไม่มีการ Whitelist ฟิลด์ที่อนุญาตให้แก้ไข
- **ผลกระทบ:**
  Admin หรือผู้ที่ยิง Request สามารถส่งฟิลด์แปลกปลอม เช่น `salesVolume: 99999` หรือเปลี่ยน `id` ของสินค้าได้
- **แนวทางแก้ไข:**
  เลือกเฉพาะฟิลด์ที่อนุญาต (Explicit Whitelisting) หรือใช้ Zod Schema กรองเฉพาะ Key ที่กำหนด

---

## หมวดที่ 3: ปัญหาด้าน Architecture, Code Quality & Maintainability (P2)

### 🟡 3.1 ลง Library ไว้ใน `package.json` แต่ไม่ได้ใช้งานจริง (Dead Dependencies)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/package.json`](file:///c:/Coding/Mini_Project/KanaShop/Backend/package.json) (มี `zod`)
  - Frontend: [`Frontend/package.json`](file:///c:/Coding/Mini_Project/KanaShop/Frontend/package.json) (มี `@tanstack/react-query`)
- **รายละเอียดปัญหา:**
  1. โปรเจกต์ติดตั้ง `zod` ไว้ใน Backend แต่ในโฟลเดอร์ `Backend/src` **ไม่มีการ Import Zod มาใช้งานแม้แต่บรรทัดเดียว** การ Validate ข้อมูลยังใช้ `if-else` แบบ Manual ซึ่งหลุดเงื่อนไขขอบเขต (Edge cases) ง่ายมาก
  2. โปรเจกต์ติดตั้ง `@tanstack/react-query` ไว้ใน Frontend แต่ทุกหน้ายังใช้ `fetch()` ผสมกับ `useState()` และ `useEffect()` ทำให้ขาดความสามารถในการทำ Caching, Auto-retry, Abort Controller และ Request Deduplication
- **แนวทางแก้ไข:**
  - นำ Zod มาใช้ตรวจสอบ Request Payload ใน Middleware ของทุก Endpoint
  - นำ React Query มาใช้จัดการ Server State ใน Frontend

---

### 🟡 3.2 ปัญหา Scalability และ I/O Bottleneck จากการใช้ JSON File Storage
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/storage/jsonStore.ts`](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/storage/jsonStore.ts)
- **รายละเอียดปัญหา:**
  แม้ว่า `JsonStore` จะออกแบบ Mutex และ Atomic Write ไว้อย่างประณีต แต่การจัดเก็บข้อมูลทั้งหมดอยู่ในไฟล์ JSON ก้อนเดียว (เช่น `orders.json`, `products.json`) ทำให้ทุกครั้งที่มีการอ่านหรือเขียน ต้องอ่านข้อมูลทั้งไฟล์เข้ามาแปลงเป็น JavaScript Object ทั้งก้อน
- **ผลกระทบ:**
  เมื่อมีคำสั่งซื้อหรือสินค้าเพิ่มขึ้นเป็นหลักพันรายการ การอ่าน/เขียนไฟล์จะกิน Memory สูงและเกิด Disk I/O Concurrency Block ที่ทำให้ Response Time ช้าลงอย่างเห็นได้ชัด
- **แนวทางแก้ไข:**
  ในระยะกลาง ควรย้ายไปใช้ SQLite (เช่น ผ่าน Better-SQLite3 หรือ Drizzle ORM) ซึ่งไม่ต้องลง Database Server เพิ่ม แต่ได้ Indexed Query, Transactions, และ Performance ที่ดีกว่าไฟล์ JSON มหาศาล

---

### 🟡 3.3 ขาด Global Error Handler และ Centralized Logging ใน Backend
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/app.ts`](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/app.ts)
- **รายละเอียดปัญหา:**
  ใน `app.ts` ไม่มี Express Error Handling Middleware (`(err, req, res, next) => {}`) ที่ดักจับ Unhandled Errors ทำให้หากมี Error ที่ไม่ได้ครอบ `try-catch` หลุดออกมา เซิร์ฟเวอร์จะตอบกลับด้วย HTML Default Error Page และอาจทำให้อันตรายต่อ Information Leakage
- **แนวทางแก้ไข:**
  เพิ่ม Global Error Handler Middleware ที่ส่ง Error Response เป็น JSON ที่มีรูปแบบมาตรฐานเดียวกันทั้งระบบ

---

### 🟡 3.4 ขาดระบบ Centralized Alert/Dialog และ Toast Notification ซ้ำซ้อน
- **ตำแหน่งไฟล์:**
  - Frontend: พบใน 6 หน้าหลัก (`AdminOrdersPage.tsx`, `AdminUsersPage.tsx`, `AdminProductsPage.tsx`, `OrderStatusPage.tsx`, `CouponPage.tsx`, `HomePage.tsx`)
- **รายละเอียดปัญหา:**
  1. มีการใช้ `alert()` และ `confirm()` ของ Native Browser อยู่หลายจุด ซึ่งบล็อก Thread การทำงานของหน้าเว็บและหน้าตาไม่เข้ากับ Design System
  2. โค้ดสร้าง Local State สำหรับแสดง Toast Notification (`const [toast, setToast] = useState(...)`) ถูกเขียนซ้ำๆ ทุกหน้าแทนที่จะเป็น Global Store
- **แนวทางแก้ไข:**
  สร้าง Zustand Store สำหรับ Toast Notification (`useToastStore`) และ Component `<ConfirmModal />` ส่วนกลาง

---

### 🟡 3.5 ไม่มี Automated Tests (0% Code Coverage)
- **ตำแหน่งไฟล์:**
  - ทั้ง Backend และ Frontend
- **รายละเอียดปัญหา:**
  ไม่มีชุดทดสอบ Unit Test หรือ Integration Test (เช่น Vitest, Jest, หรือ Playwright) เลยแม้แต่ไฟล์เดียว
- **ผลกระทบ:**
  การ Refactor หรือแก้ไข Logic ที่ซับซ้อน เช่น การคำนวณคูปอง, State Machine ของออเดอร์, หรือการตัดสต็อก มีความเสี่ยงสูงมากที่จะเกิด Regression Bugs

---

## หมวดที่ 4: ปัญหาด้าน UX/UI และ User Experience (P2 - P3)

### 🟡 4.1 Live Search ยิง API ทุกครั้งที่พิมพ์โดยไม่มี Debounce และ Race Request
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/pages/HomePage.tsx` บรรทัดที่ 46-60](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/HomePage.tsx#L46-L60)
- **รายละเอียดปัญหา:**
  ทุกครั้งที่ผู้ใช้กดแป้นพิมพ์ในช่องค้นหา `useEffect` จะส่ง `fetch()` ไปยังเซิร์ฟเวอร์ทันที โดยไม่มีการหน่วงเวลา (Debounce) และไม่มี `AbortController` ยกเลิก Request เก่า
- **ผลกระทบ:**
  หากพิมพ์คำว่า "tumbler" เซิร์ฟเวอร์จะได้รับ 7 Requests ทันที และหาก Request ก่อนหน้าตอบกลับมาช้ากว่า Request ล่าสุด ข้อมูลผลการค้นหาเก่าจะทับผลการค้นหาใหม่ (Race Condition)
- **แนวทางแก้ไข:**
  เพิ่ม Debounce 300ms สำหรับช่อง Search Input และใช้ `AbortController` ยกเลิก Request เดิม

---

### 🟡 4.2 สินค้าเปิดได้เฉพาะ Modal ขาดหน้ารายละเอียดสินค้าแยก (No Dedicated Product URL / SEO)
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/app/router.tsx`](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/app/router.tsx)
  - Frontend: [`Frontend/src/pages/HomePage.tsx` บรรทัดที่ 435-440](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/HomePage.tsx#L435-L440)
- **รายละเอียดปัญหา:**
  การดูข้อมูลสินค้าทำได้เพียงกดเปิด `ProductDetailModal` บนหน้าแรกเท่านั้น ไม่มี Route เช่น `/products/:id`
- **ผลกระทบ:**
  - ผู้ใช้ไม่สามารถคัดลอกลิงก์ URL ของสินค้านั้นเพื่อแชร์ให้เพื่อนดูได้
  - กดปุ่ม Back ของ Browser แล้วจะออกจากเว็บแทนที่จะเป็นการปิดข้อมูลสินค้า
  - ไม่รองรับ Search Engine Optimization (SEO)
- **แนวทางแก้ไข:**
  เพิ่ม Route `/products/:id` หรือทำ URL Query Param Synced Modal (เช่น `?product=prd_123`)

---

### 🟡 4.3 ตัวเลข "Popular Sales This Week" สื่อความหมายคลาดเคลื่อน (Misleading Metric)
- **ตำแหน่งไฟล์:**
  - Backend: [`Backend/src/repositories/productRepo.ts` บรรทัดที่ 57-63](file:///c:/Coding/Mini_Project/KanaShop/Backend/src/repositories/productRepo.ts#L57-L63)
  - Frontend: [`Frontend/src/pages/HomePage.tsx` บรรทัดที่ 209](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/HomePage.tsx#L209)
- **รายละเอียดปัญหา:**
  UI แสดงข้อความว่า *"X sold this week"* แต่ตัวเลขที่นำมาแสดงคือ `salesVolume` ซึ่งเป็นยอดขายสะสมตลอดกาลของสินค้านั้นตั้งแต่เริ่มเปิดร้าน ไม่ใช่ยอดขายประจำสัปดาห์จริง
- **แนวทางแก้ไข:**
  - เปลี่ยนข้อความบน UI ให้ตรงตามจริงเป็น *"X sold"* หรือ *"ยอดขายสะสม X ชิ้น"*
  - หรือคำนวณจากยอดขายใน `orders.json` ย้อนหลัง 7 วันจริง

---

### 🟡 4.4 สถานะ `CANCELLED` ตกหล่นจาก Badge ในหน้าติดตามคำสั่งซื้อ
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/pages/OrderStatusPage.tsx` บรรทัดที่ 162-215](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/OrderStatusPage.tsx#L162-L215)
- **รายละเอียดปัญหา:**
  ฟังก์ชัน `renderStatusBadge` มีการเขียนดักสถานะ `PENDING_PAYMENT`, `PAID`, `PACKING`, `PROGRESS`, `DELIVERED`, `COMPLETED`, `REJECTED` แต่ **ไม่มีเงื่อนไขสำหรับ `CANCELLED`** ทำให้ออเดอร์ที่ถูกยกเลิกแสดงผลหลุดเป็นข้อความตัวหนังสือสีดำธรรมดา (`<span className="text-xs font-bold">{status}</span>`)
- **แนวทางแก้ไข:**
  เพิ่มเงื่อนไข `case 'CANCELLED':` พร้อม Badge สีเทาหรือสีส้มที่ชัดเจน

---

### 🟡 4.5 หน้าติดตามสถานะอ้างว่าเป็น Real-time แต่ต้องกด Refresh เอง
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/pages/OrderStatusPage.tsx` บรรทัดที่ 227-239](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/OrderStatusPage.tsx#L227-L239)
- **รายละเอียดปัญหา:**
  หน้าเว็บระบุคำอธิบายว่า *"Track real-time tumbler packing and delivery status"* แต่ตัวหน้าเว็บไม่มีการเชื่อมต่อ Socket หรือ Polling เพื่ออัปเดตสถานะอัตโนมัติ ผู้ใช้ต้องกดปุ่ม Refresh เอง
- **แนวทางแก้ไข:**
  เชื่อมต่อ Socket.IO ฟังอีเวนต์ `order:status_changed` แล้วสั่ง Refetch ข้อมูลอัตโนมัติ

---

### 🟡 4.6 ภาษาบน Interface ไม่สอดคล้องกับกลุ่มเป้าหมาย (Lack of Localization)
- **รายละเอียดปัญหา:**
  แม้ว่าตัวเว็บจะมีฟอนต์ภาษาไทย (`IBM Plex Sans Thai`), รองรับ PromptPay, และขอเลขบัตรประชาชนไทย แต่ข้อความ ปุ่ม เมนู และสถานะแทบทั้งหมด 95% เป็นภาษาอังกฤษล้วน
- **แนวทางแก้ไข:**
  จัดทำระบบภาษา i18n (TH/EN) โดยตั้งค่าเริ่มต้นเป็นภาษาไทยเพื่อความเข้าใจง่ายของลูกค้าในประเทศ

---

### 🟡 4.7 ปัญหา Accessibility ด้านขนาดตัวอักษร (Typography Sizing)
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/pages/HomePage.tsx`](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/pages/HomePage.tsx)
- **รายละเอียดปัญหา:**
  มีการใช้ขนาดตัวอักษร `text-[10px]` และ `text-[11px]` เป็นจำนวนมาก โดยเฉพาะในส่วนข้อมูลสต็อกสินค้า, ป้ายหมวดหมู่, และราคา ทำให้ผู้ใช้อ่านข้อมูลยาก โดยเฉพาะบนจอมือถือ
- **แนวทางแก้ไข:**
  ปรับขนาดข้อความขั้นต่ำไม่ให้ต่ำกว่า 12px (`text-xs`) เพื่อให้ผ่านเกณฑ์การเข้าถึง WCAG

---

### 🟡 4.8 ตะกร้าสินค้าใน LocalStorage เสี่ยงต่อราคาไม่อัปเดต (Stale Cart Data)
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/stores/cartStore.ts` บรรทัดที่ 35-47](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/stores/cartStore.ts#L35-L47)
- **รายละเอียดปัญหา:**
  `cartStore` ทำการบันทึก `Product` ทั้ง Object ลงใน `localStorage` หาก Admin มีการเปลี่ยนราคาสินค้าหรือสินค้าหมดสต็อกในระบบ ตะกร้าสินค้าของผู้ใช้จะยังคงแสดงราคาและรูปภาพเดิมจนกว่าจะกดชำระเงิน
- **แนวทางแก้ไข:**
  ใน `localStorage` ควรเก็บเฉพาะ `{ productId, qty }` และทำการ Fetch ข้อมูลล่าสุดของสินค้ามา Merge หรือมีขั้นตอน Re-validate ตะกร้าเมื่อเปิดเว็บ

---

### 🟡 4.9 ฟอร์ม Checkout บังคับค่าเริ่มต้นจังหวัดเป็น 'Bangkok' และไม่จำที่อยู่
- **ตำแหน่งไฟล์:**
  - Frontend: [`Frontend/src/components/cart/CheckoutModal.tsx` บรรทัดที่ 26-33](file:///c:/Coding/Mini_Project/KanaShop/Frontend/src/components/cart/CheckoutModal.tsx#L26-L33)
- **รายละเอียดปัญหา:**
  ฟิลด์ `province` ถูก Hardcode ค่าเริ่มต้นไว้เป็น `'Bangkok'` และระบบไม่มีการบันทึกที่อยู่จัดส่งล่าสุดไว้ในโปรไฟล์ ผู้ใช้ต้องพิมพ์ที่อยู่ใหม่ทุกครั้งที่สั่งซื้อสินค้า
- **แนวทางแก้ไข:**
  ทำระบบสมุดที่อยู่ (Address Book) และ Dropdown จังหวัด/อำเภอ ที่ช่วยกรอกรหัสไปรษณีย์อัตโนมัติ

---

## หมวดที่ 5: ปัญหาจากมุมมอง User Journey (New User & Old User)

### 👤 5.1 ประสบการณ์ของผู้ใช้ใหม่ (New User Journey Pain Points)
1. **การขอข้อมูลบัตรประชาชนสร้างความไม่ไว้วางใจสูงสุด (Primary Drop-off Point):**
   การซื้อแก้วน้ำธรรมดาแต่ถูกบังคับให้กรอกเลขบัตรประชาชน 13 หลักตั้งแต่ตอนสมัครสมาชิก โดยไม่มีข้อความชี้แจงตามกฎหมาย PDPA ทำให้ผู้ใช้ใหม่ส่วนใหญ่ยกเลิกการสมัครทันที
2. **หน้าแรกขาด Hero Value Proposition:**
   เปิดเว็บมาเจอสินค้าทันทีโดยไม่มีแบนเนอร์แจ้งจุดเด่น เช่น "ของแท้ 100% ลิขสิทธิ์ถูกต้อง", "ส่งฟรีเมื่อซื้อครบ...", หรือ "รับประกันเก็บความเย็น 24 ชม."
3. **คำศัพท์เฉพาะทางไม่ชัดเจน:**
   คำว่า "SUS 304" หรือ "SUS 316" ไม่มีคำอธิบาย Tooltip ทำให้ผู้ใช้ใหม่ไม่เข้าใจความแตกต่างเพื่อประกอบการตัดสินใจซื้อ
4. **คูปองต้อนรับทำงานแบบเงียบ (Silent Welcome Coupon):**
   ระบบแจก `CPN-WELCOME10` ให้อัตโนมัติในฐานข้อมูล แต่ไม่เคยมีป๊อปอัปหรือแจ้งเตือนบอกผู้ใช้ใหม่ ทำให้เสียโอกาสสร้างความประทับใจแรก
5. **ไม่สามารถเรียงลำดับสินค้าได้ (Sort & Advanced Filter):**
   ค้นหาได้เฉพาะพิมพ์ชื่อ ไม่สามารถเรียงตาม "ราคาต่ำไปสูง" หรือกรองตามขนาดความจุ (oz) ได้

---

### 👥 5.2 ประสบการณ์ของผู้ใช้เก่า (Returning User Journey Pain Points)
1. **ต้องกรอกที่อยู่ใหม่ทุกครั้ง (No Saved Address):**
   เป็น Pain Point อันดับ 1 ของลูกค้าประจำ เพราะต้องพิมพ์ที่อยู่จัดส่งและเบอร์โทรใหม่ทุกคำสั่งซื้อ
2. **ไม่มีปุ่มสั่งซื้อซ้ำ (No "Buy Again" Feature):**
   ไม่สามารถกดสั่งซื้อสินค้ารายการเดิมจากประวัติออเดอร์เก่าได้ทันที ต้องกลับไปหน้าแรกเพื่อค้นหาใหม่
3. **ตะกร้าสินค้าไม่ Sync ข้ามอุปกรณ์ (Cross-device Inconsistency):**
   เลือกสินค้าใส่ตะกร้าไว้บนคอมพิวเตอร์ แต่เมื่อเปิดดูบนมือถือ ตะกร้ากลับว่างเปล่า เพราะระบบเก็บไว้ใน `localStorage` ของเครื่อง
4. **ระบบปฏิเสธสินค้า (Buyer Reject Gate) ไม่มีขั้นตอนคืนเงิน (No Refund Flow):**
   เมื่อผู้ใช้ตรวจสอบพัสดุแล้วกดยืนยัน Reject สินค้า สถานะออเดอร์จะเปลี่ยนเป็น `REJECTED` แต่ไม่มีขั้นตอนแจ้งเตือนว่าจะได้รับเงินคืนอย่างไร หรือต้องติดต่อใคร
5. **ไม่สามารถเปลี่ยนอีเมลหรือเบอร์โทรศัพท์ในหน้าตั้งค่าได้:**
   ในหน้า Settings อนุญาตให้แก้ได้เฉพาะ Username, Full Name, Avatar และรหัสผ่าน แต่ไม่สามารถแก้ไข Email หรือ Phone Number ได้
6. **ขาดระบบ Wishlist และการแจ้งเตือนเมื่อสินค้าเติมสต็อก (Back-in-stock Alert)**

---

## สรุป Action Plan และลำดับความสำคัญในการแก้ไข

```
[Sprint 1: Security Urgent]
  ├─ 1. นำ devPasscode ออกจาก API Response (แก้ P0 ข้อ 1.1)
  ├─ 2. เพิ่ม Zod Validation ตรวจสอบ qty > 0 (แก้ P0 ข้อ 1.2)
  ├─ 3. เปลี่ยน mark-paid เป็นการอัปโหลดสลิป (แก้ P0 ข้อ 1.3)
  ├─ 4. ปรับปรุง Upload Middleware ตรวจสอบนามสกุลและ Magic Bytes (แก้ P0 ข้อ 1.4)
  └─ 5. บังคับตั้งค่า ENV ในโหมด Production (แก้ P0 ข้อ 1.5)

[Sprint 2: Business Logic & Data Guard]
  ├─ 1. รวม Check & Deduct สต็อกให้อยู่ใน Mutex เดียวกัน (แก้ P1 ข้อ 2.1)
  ├─ 2. ปรับปรุงระบบคูปอง เช็ค collectedCoupons และคืนสิทธิ์เมื่อ Cancel (แก้ P1 ข้อ 2.2)
  ├─ 3. ทำ State Machine Guard ให้คำสั่งซื้อ และคืนสต็อกเมื่อ Admin Cancel (แก้ P1 ข้อ 2.3)
  └─ 4. เพิ่มระบบ Expiry Auto-cancel สำหรับออเดอร์ค้างชำระ (แก้ P1 ข้อ 2.4)

[Sprint 3: UX & Interface Polish]
  ├─ 1. ถอดการบังคับกรอกเลขบัตรประชาชนออกให้เป็น Optional (แก้ ข้อ 5.1)
  ├─ 2. เพิ่ม Debounce 300ms ในช่องค้นหา (แก้ P2 ข้อ 4.1)
  ├─ 3. เพิ่ม Badge แสดงสถานะ CANCELLED (แก้ P2 ข้อ 4.4)
  ├─ 4. รวมศูนย์ Toast และ Modal Component (แก้ P2 ข้อ 3.4)
  └─ 5. เพิ่มการเชื่อมต่อ Socket อัปเดตสถานะออเดอร์แบบ Real-time (แก้ P2 ข้อ 4.5)

[Sprint 4: Growth & Retention Features]
  ├─ 1. ระบบสมุดที่อยู่ (Address Book) (แก้ ข้อ 5.2)
  ├─ 2. ปุ่มสั่งซื้อซ้ำ (Buy Again) (แก้ ข้อ 5.2)
  ├─ 3. หน้ารายละเอียดสินค้าแยกตาม URL (`/products/:id`) (แก้ P2 ข้อ 4.2)
  └─ 4. ระบบรีวิวและให้คะแนนสินค้า (Product Reviews & Ratings)
```
