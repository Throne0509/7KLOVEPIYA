# 47LOVEPIYA

เว็บฐานข้อมูลทีมแก้ รันบน Cloudflare Pages + D1 (ฟรี)

```
public/index.html          หน้าเว็บ
functions/api/teams/...    API อ่าน/เพิ่ม/แก้/ลบทีม
functions/api/auth.js      ตรวจรหัสผ่านแอดมิน
lib/team.js                ตรวจข้อมูล + สิทธิ์
schema.sql                 โครงสร้างตาราง
```

คนทั่วไปดูได้อย่างเดียว ต้องกดปุ่ม "แอดมิน" แล้วใส่รหัสผ่านก่อนถึงจะเพิ่ม แก้ ลบทีมได้

---

## ขั้นตอนขึ้นเว็บ (ทำครั้งเดียว ประมาณ 15 นาที)

### 1. อัปโหลดโค้ดขึ้น GitHub

สร้าง repository ใหม่บน GitHub ชื่อ `47lovepiya` (เลือก Private ได้) แล้วรันในโฟลเดอร์นี้:

```bash
git init
git add .
git commit -m "first version"
git branch -M main
git remote add origin https://github.com/<ชื่อบัญชีคุณ>/47lovepiya.git
git push -u origin main
```

### 2. สมัคร Cloudflare

ไปที่ https://dash.cloudflare.com/sign-up สมัครด้วยอีเมล แล้วยืนยันอีเมล (ไม่ต้องใส่บัตรเครดิต)

### 3. สร้างฐานข้อมูล D1

1. เมนูซ้าย **Storage & Databases → D1 SQL Database → Create**
2. ตั้งชื่อ `47lovepiya` แล้วกด **Create**
3. เข้าไปที่ฐานข้อมูลนั้น เปิดแท็บ **Console**
4. คัดลอกทุกบรรทัดจากไฟล์ `schema.sql` วางแล้วกด **Execute**

### 4. สร้างเว็บบน Cloudflare Pages

1. เมนูซ้าย **Compute (Workers) → Workers & Pages → Create → แท็บ Pages → Connect to Git**
2. เชื่อมบัญชี GitHub แล้วเลือก repo `47lovepiya`
3. ตั้งค่า build:
   - Project name: `47lovepiya` (จะได้ลิงก์ `47lovepiya.pages.dev` ถ้าชื่อซ้ำ Cloudflare จะเติมตัวอักษรท้ายให้)
   - Framework preset: **None**
   - Build command: เว้นว่าง
   - Build output directory: `public`
4. กด **Save and Deploy** รอจนเสร็จ (ตอนนี้หน้าเว็บจะขึ้นแต่โหลดทีมไม่ได้ เพราะยังไม่ได้ต่อฐานข้อมูล ทำข้อ 5 ต่อ)

### 5. ต่อฐานข้อมูลและตั้งรหัสผ่านแอดมิน

ในโปรเจกต์ Pages ที่เพิ่งสร้าง ไปที่ **Settings**

1. **Bindings → Add → D1 database**
   - Variable name: `DB` (ตัวพิมพ์ใหญ่ ต้องตรงตัว)
   - D1 database: เลือก `47lovepiya`
2. **Variables and Secrets → Add**
   - Type: **Secret**
   - Variable name: `ADMIN_PASSWORD`
   - Value: รหัสผ่านที่คุณจะใช้เข้าแอดมิน
3. ไปแท็บ **Deployments** กดจุดสามจุดที่ deployment ล่าสุด → **Retry deployment** (ค่าที่ตั้งใหม่มีผลหลัง deploy ใหม่เท่านั้น)

เสร็จแล้วเปิด `https://47lovepiya.pages.dev` กด "แอดมิน" ใส่รหัส แล้วเพิ่มทีมแรกได้เลย

---

## แก้ไขเว็บภายหลัง

แก้ไฟล์แล้ว push ขึ้น GitHub Cloudflare จะอัปเดตเว็บให้อัตโนมัติภายใน 1–2 นาที

```bash
git add .
git commit -m "อธิบายสิ่งที่แก้"
git push
```

- เพิ่มชื่อตัวละครที่มีสีประจำประเภท: แก้ `HEROES` ใน `public/index.html`
- เพิ่มชื่อสัตว์เลี้ยงในรายการแนะนำ: แก้ `PETS` ในไฟล์เดียวกัน

## ถ้ามีปัญหา

| อาการ | สาเหตุ |
|---|---|
| หน้าเว็บขึ้น "โหลดข้อมูลไม่สำเร็จ ... (500)" | ยังไม่ได้ผูก D1 ชื่อ `DB` (ข้อ 5.1), ยังไม่ได้รัน `schema.sql` (ข้อ 3.4) หรือยังไม่ได้ Retry deployment |
| กดเข้าแอดมินแล้วขึ้น "(500)" | ยังไม่ได้ตั้ง `ADMIN_PASSWORD` (ข้อ 5.2) หรือยังไม่ได้ Retry deployment |

ดูข้อความ error จริงได้ที่โปรเจกต์ Pages → **Deployments → View details → Functions → Real-time logs**
