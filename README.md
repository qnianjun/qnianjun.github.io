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
