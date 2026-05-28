# Attendance Board Raspberry Controller

研究室内の在室状況を、**LANスキャン + Raspberry Pi + 物理LED**で可視化するシステムです。  
在室判定結果は Discord ロールとも連携し、オンライン上のステータスにも反映します。

The English version of the README is below.

---

## プロジェクト概要

このリポジトリは、出席ボードのバックエンド制御を担います。

- 定期的に LAN をスキャンして端末を検出
- 端末 MAC アドレスとユーザー登録情報を照合
- 複数回スキャンの履歴から在室を判定（ノイズ耐性あり）
- 在室ユーザーに対応する LED を Raspberry Pi GPIO で点灯
- 任意で Discord の `at HILab` ロールを自動付与 / 削除

---

## 課題と解決

### 課題
- 研究室への在室状況が口頭・自己申告に依存し、即時性が低い
- 一時的なネットワーク揺らぎで誤判定が発生しやすい
- 物理空間とオンライン空間（Discord）の状態が分断される

### 解決アプローチ
- `local-devices` で LAN 内端末を定期スキャン
- スキャン結果をスライディングウィンドウで履歴管理し、閾値判定で安定化
- Node.js から Python スクリプトを呼び出し、GPIO を統合制御
- Discord Bot で在室状態をロール同期し、チームの可視性を向上

---

## システム構成

```text
User Device (Wi-Fi/LAN)
        ↓
Node.js Scanner (Express + local-devices)
        ↓
Presence Judgment (history window + threshold)
        ↓
├─ LED Control (Node.js -> Python -> RPi.GPIO)
└─ Discord Role Mirror (discord.js)
```

---

## 実装ハイライト

### 1) 在室判定の安定化（誤判定の抑制）
- `SCAN_INTERVAL_MS` 間隔でスキャンを実行
- `SCANS_PER_WINDOW` 件の履歴を MAC ごとに保持
- `PRESENCE_THRESHOLD` 以上のヒットで在室判定
- 履歴不足時は `WARMING UP` として扱い、起動直後の誤判定を抑制

### 2) LED 制御の責務分離
- API/判定ロジックは `backend/index.js`
- LED 実機制御は `LED/led_controller.py`
- Node.js 側は `backend/led_controller.js` で Python 呼び出しを抽象化

### 3) Discord 連携
- `discordId` 登録済みユーザーのみ対象
- 在室時に `at HILab` ロール付与
- 退室確定時にロール削除
- ロール ID 未設定時はロール名検索で自動解決可能

---

## 工夫点

- **誤検知を減らす二段階判定**: 単発スキャンではなく、`SCANS_PER_WINDOW` と `PRESENCE_THRESHOLD` による履歴判定を採用し、瞬断や一時ノイズに強い在室判定にしています。
- **ウォームアップによる安全運用**: 起動直後は履歴不足を `WARMING UP` として扱い、十分な観測前に「退室」扱いしない設計にしています。
- **スキャン競合の回避**: `scanInProgress` フラグで同時スキャン実行を抑止し、処理の重複や状態の競合を防いでいます。
- **責務分離で保守性向上**: API/判定ロジック（`backend/index.js`）、Discord 同期（`backend/discord.js`）、GPIO 制御（`LED/led_controller.py`）を分離し、拡張しやすい構成にしています。
- **運用時の観測性を確保**: `LOG_PRESENCE` で在室遷移・ヒット数・スキャン状態を詳細ログ化でき、現場でのチューニングやトラブルシュートを容易にしています。
- **既存情報の保全**: ユーザー更新時に `discordId` を正規化しつつ既存値を保持する実装で、再登録時の情報欠落を防いでいます。

---

## 技術スタック

- **Runtime**: Node.js (Express), Python 3
- **Network Scan**: `local-devices`
- **Discord Integration**: `discord.js`
- **Hardware**: Raspberry Pi, `RPi.GPIO`
- **Data**: `users.json`（簡易永続化）

---

## ディレクトリ構成

```text
backend/
  index.js           # API・在室判定・スキャン制御
  discord.js         # Discordロール同期
  led_controller.js  # Python LEDスクリプト呼び出し
  users.json         # ユーザー登録情報

LED/
  led_controller.py  # GPIO LEDのON/OFF制御（本番用）
  4led.py            # 4bit表示の動作確認用スクリプト
  led.py             # LED制御の最小関数
```

---

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
npm install
```

Raspberry Pi 側で Python GPIO を使う場合:

```bash
python3 --version
```

### 2. 環境変数設定（`backend/.env`）

```env
SCAN_INTERVAL_MS=30000
SCANS_PER_WINDOW=6
PRESENCE_THRESHOLD=1
LOG_PRESENCE=true

# Discord連携を使う場合のみ設定
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_AT_HILAB_ROLE_ID=
DISCORD_AT_HILAB_ROLE_NAME=at HILab
```

### 3. サーバー起動

```bash
cd backend
node index.js
```

起動後、`http://localhost:3000/api/devices` で状態確認できます。

---

## API

### `GET /api/devices`
現在の検出デバイス、在室ユーザー、判定メタ情報を返します。

### `GET /api/whoami`
リクエスト元IPに対応する登録ユーザー情報を返します。

### `POST /api/register`
ユーザーを登録/更新します（同一 LED ID は上書き）。

Request body 例:

```json
{
  "name": "Takato",
  "ledId": 3,
  "ip": "172.16.0.143",
  "discordId": "123456789012345678"
}
```

---

## Discord ロール同期の要件

- Bot に `Manage Roles` 権限を付与
- Bot のロールを `at HILab` ロールより上位に配置
- `SERVER MEMBERS INTENT` を有効化
- `discordId` をユーザー登録時に設定

---

## 今後の改善案

- 登録情報の DB 化（現在は `users.json`）
- Web UI からの登録・編集導線の強化
- スキャン方式の多層化（BLE 併用など）
- 稼働監視・メトリクス可視化の追加

---

## ポートフォリオ観点での見どころ

- **ソフトウェアとハードウェアの統合実装**（Node.js + Python + GPIO）
- **運用を意識した誤判定対策**（履歴窓 + 閾値判定 + ウォームアップ）
- **外部サービス連携**（Discordロール自動同期）
- **責務分離された設計**（API / 判定 / ハード制御 / 連携の分離）

---
---

# English Version

## Attendance Board Raspberry Controller

This project visualizes lab attendance using **LAN scanning + Raspberry Pi + physical LEDs**.  
Presence status can also be mirrored to Discord roles to reflect who is currently in the lab.

---

## Project Overview

This repository contains the backend controller for the attendance board.

- Periodically scans devices on the local network
- Matches detected MAC addresses with registered users
- Determines presence from scan history (noise-tolerant)
- Turns on LEDs mapped to users via Raspberry Pi GPIO
- Optionally adds/removes the Discord `at HILab` role

---

## Problem and Solution

### Problem
- Lab attendance depended on manual communication and was not real-time
- Temporary network instability caused false positives/negatives
- Physical presence and online status (Discord) were disconnected

### Solution
- Use `local-devices` to run recurring LAN scans
- Keep a sliding window of scan results and apply threshold-based judgment
- Integrate Node.js and Python for stable GPIO LED control
- Synchronize Discord roles from LAN-based presence for team visibility

---

## System Architecture

```text
User Device (Wi-Fi/LAN)
        ↓
Node.js Scanner (Express + local-devices)
        ↓
Presence Judgment (history window + threshold)
        ↓
├─ LED Control (Node.js -> Python -> RPi.GPIO)
└─ Discord Role Mirror (discord.js)
```

---

## Implementation Highlights

### 1) Stable Presence Detection
- Scans run every `SCAN_INTERVAL_MS`
- Per-MAC history stores `SCANS_PER_WINDOW` results
- User is considered present when hits >= `PRESENCE_THRESHOLD`
- If history is not full yet, status remains `WARMING UP`

### 2) Separated Responsibilities for LED Control
- API and presence logic: `backend/index.js`
- Hardware GPIO control: `LED/led_controller.py`
- Node-side Python bridge: `backend/led_controller.js`

### 3) Discord Integration
- Applies only to users with `discordId`
- Adds `at HILab` role when present
- Removes role when confidently absent
- Can resolve role by name when role ID is not preconfigured

---

## Engineering Decisions

- **Two-step presence judgment**: Uses history window + threshold instead of a single scan, reducing false detection caused by transient network noise.
- **Warm-up safety mode**: Keeps users out of "absent" state until enough observations are collected, preventing incorrect state changes right after startup.
- **Scan race prevention**: Uses `scanInProgress` to prevent overlapping scans and state conflicts.
- **Modular design**: Separates API/presence logic, Discord sync, and GPIO control for maintainability and easier extension.
- **Operational observability**: `LOG_PRESENCE` provides detailed logs for transitions, hit counts, and scan status, helping field debugging and tuning.
- **Data preservation on updates**: Normalizes `discordId` while preserving existing values during re-registration.

---

## Tech Stack

- **Runtime**: Node.js (Express), Python 3
- **Network Scan**: `local-devices`
- **Discord Integration**: `discord.js`
- **Hardware**: Raspberry Pi, `RPi.GPIO`
- **Data**: `users.json` (lightweight persistence)

---

## Directory Structure

```text
backend/
  index.js           # API, presence logic, scanner control
  discord.js         # Discord role synchronization
  led_controller.js  # Python LED script bridge
  users.json         # User registry

LED/
  led_controller.py  # GPIO LED ON/OFF control (production)
  4led.py            # 4-bit display test script
  led.py             # Minimal LED helper functions
```

---

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

For Raspberry Pi GPIO usage:

```bash
python3 --version
```

### 2. Configure environment variables (`backend/.env`)

```env
SCAN_INTERVAL_MS=30000
SCANS_PER_WINDOW=6
PRESENCE_THRESHOLD=1
LOG_PRESENCE=true

# Required only if Discord sync is enabled
DISCORD_BOT_TOKEN=
DISCORD_GUILD_ID=
DISCORD_AT_HILAB_ROLE_ID=
DISCORD_AT_HILAB_ROLE_NAME=at HILab
```

### 3. Start backend

```bash
cd backend
node index.js
```

Then access `http://localhost:3000/api/devices`.

---

## API

### `GET /api/devices`
Returns detected devices, active users, and presence metadata.

### `GET /api/whoami`
Returns the requester IP and mapped registered user (if any).

### `POST /api/register`
Registers or updates a user (same LED ID is overwritten).

Example request body:

```json
{
  "name": "Takato",
  "ledId": 3,
  "ip": "172.16.0.143",
  "discordId": "123456789012345678"
}
```

---

## Discord Role Sync Requirements

- Grant the bot `Manage Roles` permission
- Place the bot role above the `at HILab` role
- Enable `SERVER MEMBERS INTENT`
- Register each user's `discordId`

---

## Future Improvements

- Move from `users.json` to a database
- Improve registration/edit flows via web UI
- Add multi-layer presence signals (e.g., BLE)
- Add runtime monitoring and metrics dashboards

---

## Portfolio Value

- **Full-stack + hardware integration** (Node.js + Python + GPIO)
- **Production-aware reliability design** (history window + threshold + warm-up)
- **External platform integration** (automatic Discord role sync)
- **Maintainable architecture** (clear separation of API, logic, hardware, and integrations)
