# NutMe 🥜🔥  
**Playful AI Roast Generator** – *Upload a face (with consent) → Pick an intensity → Get a witty, observational, light‑hearted roast. No hate, no slurs, no abuse – just clever energy.*

<p align="center">
  <img src="assets/media/nutme-demo.gif" alt="NutMe demo animation" width="640" />
</p>

<div align="center">

![Status](https://img.shields.io/badge/status-active-success?style=flat-square)
![Stack](https://img.shields.io/badge/stack-PHP%20%7C%20Gemini%20%7C%20Tailwind-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-yellow.svg?style=flat-square)
![PRs](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)
![No Hate](https://img.shields.io/badge/content-policy_safe-important?style=flat-square)

</div>

---

## ✨ Why NutMe?

Because sometimes you want a roast that’s:
- **Clever** not crude  
- **Fast** (Gemini 2.5 Flash model)  
- **Consensual & safe** (safety filter + moderation layer)  
- **Mobile-first** with a slick dark/light UI  
- **Regeneratable** without re-uploading the same face  

> “Chaotic” intensity = higher metaphor density… **not** bullying.

---

## 🧠 Quick Look

| Layer | Tech / Tool | Purpose | Notes |
|-------|-------------|---------|-------|
| Frontend Markup | HTML5 | Structure | Mobile-first, semantic |
| Styling | Tailwind CDN + Custom CSS | Theme & components | Glassy-dark + light mode; custom chips |
| Scripting | Vanilla JavaScript (ES6) | Upload UX & interactivity | Drag & drop, skeleton loader, ARIA |
| Backend | PHP 8+ | API endpoint & image handling | `roast.php` with cURL to Gemini |
| AI Model | Google **Gemini 2.5 Flash** | Multimodal generation | Image + prompt → roast text |
| Safety Layer | `SafetyFilter.php` & `PostModerator.php` | Censor & detect disallowed terms | Expandable |
| Formatting | `ResponseFormatter.php` | Output normalization | Bullet/token cleanup |
| Share Metadata | Open Graph + Twitter tags | Social previews | Defined in `<head>` |
| Hosting | Any PHP-capable host | Deployment flexibility | Works with `php -S` |
| Env Config | `.env` | Secret key injection | Never commit real key |
| Logging (optional) | `/logs/gemini.log` | Debug & audit | Disable in production if needed |

---

## 🚀 Features

- 🎯 **Intensity chips**: Mild · Spicy · Chaotic (tone ramp, never hateful)
- 🖼️ Drag & drop image upload with size/type validation
- ♿ **Accessible**: Radiogroup ARIA, live regions, focus states, skip link
- 🌗 **Theme toggle**: Dark / Light with persistence
- 🔁 **Regenerate**: Fresh roast without re-upload
- 🧊 **Skeleton loading**: Animated roast placeholder
- 🧪 **Safety pass**: Blocks / masks banned terms & prevents escalation
- ✂️ Modular backend – easy to swap models or moderation strategy
- 🔗 OG + Twitter meta -> Nice embeds in Discord / WhatsApp / etc.
- 🧩 Structured JSON-LD (WebApplication schema)

---

## 🏗️ Directory Structure

```
NutMe/
├─ index.html
├─ roast.php
├─ .env.example
├─ styles/
│  └─ custom.css
├─ assets/
│  ├─ js/
│  │  └─ app.js
│  ├─ media/
│  │  └─ nutme-demo.gif      (your demo GIF – add this)
│  └─ img/                   (optional extra images)
├─ utils/
│  ├─ SafetyFilter.php
│  ├─ ResponseFormatter.php
│  └─ PostModerator.php
├─ uploads/
│  └─ .htaccess
├─ logs/
│  └─ .gitkeep
├─ LICENSE (add one)
└─ README.md
```

---

## 🔑 Environment Setup

1. Copy the example env:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env`:
   ```
   GEMINI_API_KEY=YOUR_REAL_KEY_HERE
   ```
3. **Never** commit `.env`:
   - Use the provided `.gitignore`
4. (Optional) Add:
   ```
   GEMINI_MODEL=gemini-2.5-flash
   GEMINI_API_VERSION=v1
   ```

---

## 🧪 Local Development

```bash
# Inside project root
php -S localhost:8080
# Open in browser:
http://localhost:8080
```

(Optional) If you add a simple watch tool (like `live-server`), just proxy PHP via an embedded server or Docker.

---

## 🖥️ Usage Flow

1. Launch site → choose dark/light.
2. Upload an image (JPG / PNG / WEBP, ≤ 4MB).
3. (Optional) Provide context: “Exam week survivor”, “Just woke up”, etc.
4. Pick intensity:
   - Mild = soft observational
   - Spicy = sharper analogies, still friendly
   - Chaotic = high energy, rapid-fire metaphors
5. Click “Roast Me”.
6. Regenerate if desired.
7. Copy & share responsibly.
8. Reset to start over.

---

## 🛡️ Safety & Ethics

| Aspect | Approach |
|--------|----------|
| Consent | Explicit checkbox required |
| Banned Terms | Filtered & masked (`SafetyFilter`) |
| Identity & Protected Traits | Prompt instructs model to avoid targeting |
| Regeneration | Does not escalate aggression; just reframes humor |
| Logging | (Optional) Lightweight for debugging – purge sensitive data |
| Upload Privacy | Files stored locally; add a cron to purge periodically |

> Want stronger moderation? Plug in an additional external API or sentiment check before output.

---

## ⚙️ Backend Flow

```mermaid
flowchart LR
U(User) -->|image+form| P[roast.php]
P --> V[Validate file]
P --> B[Build Prompt]
P --> M[Gemini API (image + text)]
M --> R[Raw Candidate Text]
R --> S[SafetyFilter / PostModerator]
S --> F[ResponseFormatter]
F --> J[JSON Response]
J --> U
```

---

## 🔄 Extending

| Goal | Quick Idea |
|------|------------|
| Image compression | Canvas resize before upload (JS) |
| Auth / sessions | Add minimal token to track user sessions |
| Rate limiting | Log IP + timestamp (SQLite / Redis) |
| Pro model swap | Change `MODEL_NAME` in `roast.php` |
| Auto re-try on banned terms | Loop N times before returning sanitized |
| Docker deploy | Add `Dockerfile` + `docker-compose.yml` |
| CI checks | GitHub Actions: lint PHP, run basic security scans |
| Social preview upgrade | Replace `logo.png` with `social-card.png` (1200x630) |

---

## 🧩 API Endpoint (Internal)

`POST /roast.php` (multipart/form-data)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| photo | file | ✅ | Image to roast |
| intensity | enum(mild, spicy, chaotic) | ✅ | Roast energy level |
| userContext | string | ❌ | Flavor text to seed personality |
| regen | "1" | ❌ | Indicates a regeneration request |
| previousPrompt | string | ❌ | Used on regen to diversify prompt |

**Response:**
```jsonc
{
  "roast": "text...",
  "meta": {
    "prompt": "full prompt...",
    "fileSavedAs": "abc12345.png",
    "intensity": "chaotic",
    "model": "gemini-2.5-flash",
    "version": "v1",
    "moderation": { "ok": true }
  }
}
```

---

## 🧪 Banned Word Strategy

- Simple lexical list → masked with asterisks.
- `PostModerator` returns a status if blocked terms appear (you can escalate into regen loop).
- Extend by:
  ```php
  // e.g. integrate Perspective API or custom classifier
  ```

---

## 🛠️ Development Scripts (Suggested – add if you like)

| Command | Purpose |
|---------|---------|
| `php -S localhost:8080` | Run local dev server |
| `find uploads -type f -mtime +1 -delete` | Purge stale images (>1 day) |
| `php -l roast.php` | Syntax check backend |
| `composer require vlucas/phpdotenv` | If you switch to a dotenv loader |

---

## 📦 Production Tips

- Serve via Nginx + PHP-FPM for performance.
- Put `/uploads` behind size & type checks (already done in PHP).
- Enable HTTPS (Let’s Encrypt).
- Set long cache headers for static assets (CSS/JS) – but version them if you minify.
- Disable verbose logging / remove raw prompts if privacy sensitive.

---

## 🐞 Common Pitfalls

| Problem | Fix |
|---------|-----|
| 404 model not found | Use actual model from `GET /v1/models` listing |
| Empty roast | Safety filtering blocked; lower intensity or adjust prompt |
| Slow first response | Cold start + network; keep warm with periodic lightweight ping |
| Key leaked | Rotate Gemini API key immediately & purge logs |

---

## 🗺️ Roadmap

- [ ] Client-side image downscale
- [ ] Auto purge script (cron)
- [ ] Docker / Compose stack
- [ ] Optional account system + saved roast history
- [ ] Multi-language UI
- [ ] Adjustable output length slider
- [ ] Retry on flagged output
- [ ] Accessibility audit pass (axe-core integration)

---

## 🤝 Contributing

1. Fork & clone
2. Create a feature branch: `git checkout -b feature/cool-thing`
3. Commit with style: `feat: add cool thing`
4. Open a PR (describe change, include before/after screenshot if UI)
5. Keep it playful & safe

---

## 🧾 License

Recommend **MIT** (add `LICENSE` file):

> “Permission is hereby granted…"

---

## 🙏 Acknowledgements

- Google Gemini for the multimodal model
- Everyone keeping humor fun & non-toxic
- You – for not turning this into a harassment machine

---

## 📣 Quick Share Snippet

> NutMe – Upload a face (with consent) & get a playful AI roast. Safe, witty, no hate.

---

### 💬 Need Something?

Want a Dockerfile, CI pipeline, or a social card template?  
Open an issue or ask away. PRs welcome!

---

*Roast responsibly.* 🥜
