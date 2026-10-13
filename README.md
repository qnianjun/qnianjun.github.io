# Personal Tech Blog — Hugo + PaperMod

A personal blog/portfolio starter for CTF writeups, cybersecurity, programming,
Linux/Docker notes, projects, and general posts.

## Stack
- Hugo
- PaperMod
- GitHub Pages
- GitHub Actions
- Automatic light/dark theme toggle

## Local setup

1. Install Hugo Extended (Hugo >= 0.146.0 is recommended by the current PaperMod installation guide).
2. Initialize the PaperMod theme:

```bash
git clone https://github.com/adityatelange/hugo-PaperMod themes/PaperMod --depth=1
```

3. Start the local server:

```bash
hugo server -D
```

Open http://localhost:1313/

## Publish

Create a repository named:

`YOUR_USERNAME.github.io`

Then:

```bash
git init
git add .
git commit -m "initial blog"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_USERNAME.github.io.git
git push -u origin main
```

In GitHub:
Settings -> Pages -> Source -> GitHub Actions.

The included workflow builds Hugo and deploys the `public/` directory.

## New post

```bash
hugo new posts/my-first-post.md
```

Then edit the Markdown file and push.

## Customize

Edit `hugo.yaml`:
- title
- description
- author
- GitHub URL
- navigation
- social links

Edit `assets/css/extended/custom.css` for visual customization.

Replace the placeholder links and author name before publishing.

## Spotify 與頭像

首頁支援 Spotify「正在聽」卡片與個人照片。設定方式見 [Spotify 與頭像設定](workers/spotify/README.md)。

## 筆記本介面

- 首頁資訊面板會依已發布文章自動產生文章數、標籤數、分類數與最新文章日期。
- 主題捷徑連到實際標籤頁；「隨機讀一篇」從已發布文章中選取。
- 按 `/` 或 `Ctrl/Cmd + K` 開啟搜尋；在輸入框中不攔截按鍵。
- 文章頁提供頂部閱讀進度及複製文章連結。
- 網格、資訊面板與文章卡片樣式由 `assets/css/extended/custom.css` 管理。
