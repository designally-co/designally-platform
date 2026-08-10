# Setup — from nothing to Claude Code

Follow these in order. The order matters: `create-next-app` refuses to run in a folder that already has files in it, so **the Next.js app is created first and the starter files are added afterwards.**

---

## 1 · Check you have Node.js

Open **Terminal** on your Mac — press `Cmd + Space`, type `terminal`, press Enter.

Type this and press Enter:

```bash
node --version
```

**If you see something like `v20.11.0`** — anything v18 or higher — you're ready. Skip to step 2.

**If you see `command not found`**, install Node first. Go to [nodejs.org](https://nodejs.org), download the **LTS** version, open the installer, click through it. Close Terminal, open it again, and run `node --version` to confirm.

---

## 2 · Choose where the project lives

In Terminal, move to the folder you want the project inside. For example:

```bash
cd ~/Documents
```

`cd` means "change directory". `~` means your home folder. So this puts you inside Documents.

To check where you are at any point:

```bash
pwd
```

---

## 3 · Create the Next.js app

Paste this whole line and press Enter:

```bash
npx create-next-app@latest designally-platform --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

It may ask **"Ok to proceed? (y)"** the first time — type `y` and press Enter.

Those flags answer every setup question in advance, so it won't ask you about TypeScript, Tailwind, App Router or anything else. It will take a minute or two while it downloads.

If a newer version asks one extra question — **"Would you like to use Turbopack?"** — answer **Yes**.

When it finishes you'll see something like `Success! Created designally-platform`.

---

## 4 · Go into the folder

```bash
cd designally-platform
```

---

## 5 · Check it works before adding anything

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. You should see the default Next.js welcome page.

Press `Ctrl + C` in Terminal to stop it.

Do this now rather than later. If something is wrong with Node or the install, you want to find out before there's anything of yours in the folder.

---

## 6 · Add the starter files

Unzip `designally-platform-starter.zip`. Inside is a folder called `designally-platform` containing:

```
README.md   CLAUDE.md   PRODUCT.md   DESIGN.md   SETUP.md
docs/   reference/   seed/
```

Copy **all of those** into the project folder you just created. In Finder, open both folders side by side and drag everything across. macOS will ask whether to merge or replace — choose **Merge**, and **Replace** if it asks about `README.md`.

Or in Terminal, if the unzipped folder is in Downloads:

```bash
cp -R ~/Downloads/designally-platform/. .
```

The `.` at the end of the source path means "everything inside, including hidden files". The final `.` means "into the folder I'm in now".

---

## 7 · Start git

```bash
git init
git add .
git commit -m "Starter: product, design system, docs, question seed"
```

This gives you a point to return to. Commit often from here — when something breaks badly, going back to yesterday is much easier than arguing your way forward.

---

## 8 · Install Claude Code

If you don't have it yet:

```bash
npm install -g @anthropic-ai/claude-code
```

Check it:

```bash
claude --version
```

---

## 9 · Start

Make sure you're still inside the project folder, then:

```bash
claude
```

Now paste the readiness check from `docs/first-session-brief.md`. **Do this before asking for any code.** If it can tell you back what the product does, what the four human gates are and why the project table has no star, the context landed and the build will go well.

---

## If something goes wrong

**`command not found: npx`** — Node isn't installed, or Terminal needs restarting. Go back to step 1.

**`The directory designally-platform contains files that could conflict`** — you ran `create-next-app` in a folder that already had the starter files. Move them out, run it, and put them back.

**`EACCES: permission denied` when installing Claude Code** — try `sudo npm install -g @anthropic-ai/claude-code` and enter your Mac password.

**Port 3000 already in use** — something else is running. Either stop it, or run `npm run dev -- -p 3001` and use `localhost:3001`.
