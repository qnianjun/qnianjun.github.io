# Spotify「正在聽」設定

此 Worker 只提供 Mark 的公開播放資訊，訪客不需登入。Hugo 仍由 GitHub Pages 託管。
首頁每 60 秒更新一次；Worker 每個執行個體快取播放狀態 30 秒。
未播放、暫停、本機歌曲或非歌曲內容顯示休息狀態；連線或授權失敗顯示暫時離線。

## 1. 建立 Spotify App

在 https://developer.spotify.com/dashboard 建立 App：

- 名稱：`Mark Blog Now Playing`
- Website：`https://xn--mark-oc2g.tw/`
- Redirect URI：`http://127.0.0.1:8888/callback`（精確一致，不用 localhost）
- API：Web API

目前開發模式要求 App 擁有者具備 Spotify Premium。
只需授權 `user-read-currently-playing`，不需要播放控制、email 或播放歷史權限。

## 2. 在自己的電腦授權

需要 Python 3。在有瀏覽器的個人電腦上，從本 repo 根目錄執行：

```sh
python3 scripts/spotify-authorize.py
```

依提示輸入 Client ID 與 Client Secret。瀏覽器登入自己的 Spotify 帳號並同意授權。
終端機會顯示 refresh token；僅把它貼入下一步 Cloudflare 的 Secret，勿放進 Git、聊天、截圖或 Hugo 設定。
程式不會寫入任何憑證檔案，5 分鐘未完成會結束。

## 3. 部署 Cloudflare Worker

可使用 Cloudflare Dashboard，全程不需在此環境登入：

1. Workers & Pages → Create → 建立 Worker，名稱 `mark-spotify`。
2. Edit code：以 `worker.mjs` 的內容取代預設程式並 Deploy。
3. 在 Storage & databases → KV 建立 namespace `mark-spotify-tokens`。
4. Worker → Settings → Bindings，新增 KV namespace binding，變數名稱 `SPOTIFY_TOKENS`，選剛建立的 namespace。
5. Worker → Settings → Variables and Secrets：

| 名稱 | 類型 | 值 |
| --- | --- | --- |
| `SPOTIFY_CLIENT_ID` | Secret | Spotify App 的 Client ID |
| `SPOTIFY_CLIENT_SECRET` | Secret | Spotify App 的 Client Secret |
| `SPOTIFY_REFRESH_TOKEN` | Secret | 授權工具產生的 token |
| `ALLOWED_ORIGINS` | Text | `https://xn--mark-oc2g.tw,https://qnianjun.github.io` |

儲存並部署。KV 用來保存 Spotify 換發的 refresh token。

也可以使用已安裝 Node.js 的電腦：

```sh
cd workers/spotify
npx wrangler login
npx wrangler kv namespace create SPOTIFY_TOKENS
# 把回傳的 namespace id 填入 wrangler.toml，再執行：
npx wrangler deploy
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
npx wrangler secret put SPOTIFY_REFRESH_TOKEN
```

每個 `secret put` 都會互動式詢問值，勿把值放在命令列參數。
若要本機預覽，把 `http://127.0.0.1:1313` 加入 `ALLOWED_ORIGINS`。

## 4. 接上首頁

打開 `https://mark-spotify.你的子網域.workers.dev/now-playing`。
播放 Spotify 歌曲時應回傳 `status: "playing"` 與歌名；停止時為 `status: "idle"`。
把完整網址填入 `hugo.yaml`：

```yaml
params:
  spotify:
    endpoint: "https://mark-spotify.你的子網域.workers.dev/now-playing"
```

推送 blog 後首頁音樂卡片會出現。endpoint 留空時不顯示卡片。
這個 URL 是公開資訊，可以提供給協助修改 blog 的人；三個 Secret 不行。

## 自訂頭像

將圖片放入 `static/images/avatar.jpg`，設定 `params.homeInfoParams.Avatar: "/images/avatar.jpg"`。
首頁會以 96px 方形帶圓角顯示，使用 CSS 裁切而不更動原始照片；留空時維持 M 字頭像。

## 維護與驗證

- Spotify refresh token 目前有效期為 6 個月；過期或撤銷時重新執行授權工具、更新 Secret，並刪除 KV 裡的 `refresh_token` 舊值，再重新部署。
- `503` 代表未設定完成或 Spotify 暫時不可用；`403` 代表網站來源未在 `ALLOWED_ORIGINS` 內。
- CORS 控制瀏覽器可讀取的來源，不代表 endpoint 是私有的；它刻意只公開歌名、歌手、專輯、封面與歌曲連結。
- 上線前跑 `node --test workers/spotify/worker.test.mjs` 與 `hugo --gc --minify`。

官方文件：[授權](https://developer.spotify.com/documentation/web-api/tutorials/code-flow)、[refresh token](https://developer.spotify.com/documentation/web-api/tutorials/refreshing-tokens)、[開發模式](https://developer.spotify.com/documentation/web-api/concepts/quota-modes)、[Cloudflare Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)。
