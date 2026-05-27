# attendance-board-raspberry-controller

開発用のプライベートリポジトリです。  
Raspberry Pi上で動作するコントローラーが、研究室ネットワーク内のユーザー端末を検出し、出席ボード上の対応するLEDを制御します。

This is a private repository for development.  
A controller running on a Raspberry Pi detects user devices on the local network and controls the corresponding LEDs on the attendance board.

---

## 📝 Overview

本リポジトリは、出席管理システムにおけるRaspberry Pi側の制御プログラムを管理します。

This repository manages the Raspberry Pi-side control program for the attendance management system.

### 主な役割 (Main Functions)

- LAN内端末の検出 (Local network device detection)
- ユーザー識別 (User identification)
- 出席状態の判定 (Attendance status determination)
- LED（ライト）の制御 (LED control)
- 出席状況の物理的可視化 (Physical visualization of attendance status)

---

## 🏗️ System Overview

### システム構成 (System Flow)

```text
User Device
    ↓
Research Lab Wi-Fi
    ↓
Raspberry Pi Device Scanner
    ↓
User Identification
    ↓
LED Control
    ↓
Attendance Board Visualization
```

### 動作概要 (Behavior)

- Raspberry Piが研究室ネットワーク内の端末を検出
- 登録済みユーザー情報と照合
- 対応するユーザーのLEDを点灯／消灯
- 出席状況を物理的に可視化

The Raspberry Pi scans devices on the local network, matches them with registered users, and controls the corresponding LEDs to visualize attendance status physically.

---

## 🔧 Development Environment

- Raspberry Pi 3 / 4
- OS：Raspberry Pi OS
- Node.js：v18+
- npm
- Express
- local-devices

---

## ⚙️ Setup

### 0. Raspberry Pi and local repository

- Raspberry Pi側は`main`ブランチと同期しています。
- ローカル環境ではリポジトリが`Documents/GIT/attendance-board-rasberry-controller`内にあります。

### 1. Raspberry Pi access

Raspberry Piのログイン情報

```bash
ssh [USER]@[LOCAL_ADDRESS]
```

### 2. Install Node.js

#### Raspberry Pi / Linux

Update packages:

```bash
sudo apt update
sudo apt upgrade -y
```

Install Node.js and npm:

```bash
sudo apt install -y nodejs npm
```

Verify installation:

```bash
node -v
npm -v
```

---

#### Windows

Install the LTS version of Node.js from the official website.

https://nodejs.org/

After installation, verify it with:

```bash
node -v
npm -v
```

---

### 3. Clone Repository

```bash
git clone <repository-url>
cd attendance-board-raspberry-controller
```

---

### 3. Install Dependencies

バックエンドは `backend/` ディレクトリで実行します。

```bash
cd backend
npm install
```

---

### 4. Start Server

`backend` ディレクトリ内で次のコマンドを実行してください。

```bash
node index.js
```

リポジトリルートで `node index.js` を実行すると `index.js` が見つからないエラーになります。

サーバが正常に起動すると、以下のように表示されます。

When the server starts successfully, the following message will appear:
```text
Scanner running on port 3000
```

---

### 5. Start Frontend (Vue + Vite)

フロントエンドを起動するには、別ターミナルで `http://localhost:3000/api/devicesdebug-frontend` ディレクトリへ移動して依存関係をインストールします。

To start the frontend, open another terminal, move into the `debug-frontend` directory, and install dependencies.

```bash
cd debug-frontend
npm install
npm run dev
```

起動後はブラウザで以下にアクセスします。

After startup, open:

```text
http://localhost:8080
```

---

### 5. Access API

バックエンドが起動したら、ブラウザや API クライアントで直接確認できます。

Access the backend directly from your browser or API client:
```text
http://localhost:3000/api/devices
```

この URL を開くと、検出済みデバイスと登録済みユーザー情報を含む JSON レスポンスが表示されます。

---

## 📡 API

### GET `/api/devices`

検出されたLAN内端末一覧を取得します。

Returns the list of detected devices on the local network.

Example Response
```json
{
  "meta": {
    "lastScanAgeSeconds": 19,
    "scanIntervalSeconds": 30,
    "scansPerWindow": 6,
    "presenceThreshold": 2,
    "discordRoleSync": true,
    "atHilabRoleId": "00000000000000000000",
    "atHilabRoleName": "at HILab"
  },
  "count": 2,
  "activeUsers": [
    {
      "name": "Johanna Doey",
      "ledId": 2,
      "mac": "00:00:00:00:00:00",
      "discordId": "000000000000000000",
      "ip": "172.16.0.11",
      "presenceSource": "lan",
      "presenceHits": 6,
      "presenceScans": 6,
      "isPresent": true
    }
  ],
  "allDevices": [
    {
      "ip": "172.16.0.11",
      "mac": "00:00:00:00:00:00",
      "name": "Johanna Dowy",
      "ledId": 2,
      "isRegistered": true,
      "seenInLatestScan": true,
      "isPresent": true,
      "presenceSource": "lan",
      "presenceHits": 6,
      "presenceScans": 6
    },
    {
      "ip": "172.16.0.21",
      "mac": "ab:cd:ef:12:23:45",
      "name": "Unknown",
      "ledId": null,
      "isRegistered": false,
      "seenInLatestScan": true,
      "isPresent": false,
      "presenceSource": null,
      "presenceHits": null,
      "presenceScans": null
    }
  ]
}
```

---

### GET `/api/whoami`

要求元のデバイスのIPアドレスと、デバイスが登録されている場合は登録済みユーザーを返します。

Returns the IP address of the requesting device, and the registered user, if the device is registered.

---

### POST `/api/register`

ユーザー情報を登録します。

Registers user information.

#### Request Body

```json
{
  "name": "Takato",
  "ledId": 3,
  "ip": "172.16.0.143",
  "discordId": "123456789012345678"
}
```

`discordId` は任意です。入れたユーザーについては、**LAN で在室と判定されたときに Bot が `at HILab` ロールを付与**し、**退室と判定されたらロールを外します**（下記）。

Discord 関連の同期処理は `backend/discord.js` に分離されています。

---

## Discord「at HILab」ロールの自動付与・削除

在室判定は **従来どおり LAN スキャン履歴**（`isUserPresent`）です。`users.json` に **`discordId`** があるユーザーだけ、Discord 上の **`at HILab`** ロールをそれに合わせて更新します。

### 手順

1. Discord でロール **`at HILab`** を作成（名前は `DISCORD_AT_HILAB_ROLE_NAME` で変更可）
2. **Bot のロールを、`at HILab` より上**に並べる（Discord の「ロールの管理」では、上のロールが下位ロールを付与できる）
3. Bot に **`ロールの管理`（Manage Roles）** 権限を付与
4. [Developer Portal](https://discord.com/developers/applications) で Bot を作成しトークンを取得
5. **Privileged Gateway Intents** で **SERVER MEMBERS INTENT** を ON（メンバー取得に必要）
6. Bot を研究室サーバーに招待
7. `backend/.env` に `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_AT_HILAB_ROLE_ID`（推奨）を設定
   - `backend/.env.example` は例なので、実際の稼働時は `backend/.env` を作成してください
8. 各ユーザーの **Discord ユーザー ID** を `discordId` として登録

### 動作

- **在室（LAN 判定）** → その人に **`at HILab` を付与**（まだ付いていなければ）
- **退室（履歴が `SCANS_PER_WINDOW` 回たまったうえで在室条件を満たさない）** → **`at HILab` を削除**（付いていれば）
- ウォームアップ中（履歴が 6 回未満）は **ロールを外さない**（起動直後に全員から剥がすのを防ぐ）

### API

`GET /api/devices` の `meta.discordRoleSync` が true のとき、Bot がログイン済みでロール同期が有効です。在室判定そのものは `presenceSource: 'lan'` です。

---

## 🚧 Future Tasks

- フロントエンド登録画面の作成
- MACアドレスベース認識への移行
- GPIOによるLED制御
- Bluetooth / BLE対応
- データベース対応
- リアルタイム在室表示UIの追加
