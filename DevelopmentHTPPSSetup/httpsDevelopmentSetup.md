# HTTPS Setup Guide: Next.js Frontend + Django Backend

Covers local development and production, end to end.

**Stack:**
- Frontend: Next.js
- Backend: Django + DRF
- Dev HTTPS: `mkcert` (self-signed, locally trusted)
- Prod HTTPS: Nginx terminating TLS with a Cloudflare origin certificate

---

## 1. Overview

| | Frontend | Backend |
|---|---|---|
| **Dev** | Next.js dev server over HTTPS via `mkcert` | Django `runsslserver` (optional) over HTTPS via `mkcert`, or plain HTTP |
| **Prod** | Next.js served behind Nginx (TLS terminated by Nginx) | Django (Gunicorn/uWSGI) behind Nginx (TLS terminated by Nginx) |

In both environments, Django itself never needs to know about certificates directly in prod — Nginx handles TLS and forwards plain HTTP internally. In dev, Django can optionally serve HTTPS directly since there's no reverse proxy.

---

## 2. Frontend (Next.js) — Development

### 2.1 Generate local certificates with `mkcert`

```bash
# Install mkcert
brew install mkcert nss        # macOS
choco install mkcert           # Windows
sudo apt install mkcert        # Linux

mkcert -install                # creates & trusts a local CA
mkcert localhost                # generates localhost.pem + localhost-key.pem
```

Add both files to `.gitignore`:
```text
localhost.pem
localhost-key.pem
```

### 2.2 Configure the dev script

```json
"scripts": {
  "dev": "next dev --experimental-https --experimental-https-key localhost-key.pem --experimental-https-cert localhost.pem"
}
```

Run `npm run dev` → serves on `https://localhost:3000`.

### 2.3 Fix Node's self-signed cert trust

Server Components, Server Actions, and Route Handlers run in Node, which doesn't trust `mkcert`'s CA by default. Without this, calls to your Django API can throw `DEPTH_ZERO_SELF_SIGNED_CERT`.

`.env.local`:
```env
NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
```

---

## 3. Frontend (Next.js) — Production

In production, Next.js does not need any HTTPS configuration of its own. It runs as a plain HTTP process (`127.0.0.1:3000`) and Nginx terminates TLS in front of it, exactly like the backend (see §5).

Actual production config (`prithviex.com`), including WebSocket support (for Next.js HMR/dev tooling and any live features) and a proxied GeoServer instance:

```nginx
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name prithviex.com www.prithviex.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name prithviex.com www.prithviex.com;

    ssl_certificate     /etc/ssl/certs/cloudflare.crt;
    ssl_certificate_key /etc/ssl/private/cloudflare.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }

    location /geoserver {
        proxy_pass http://127.0.0.1:8080/geoserver;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        proxy_redirect off;
        client_max_body_size 200M;   # heavy multi-part spatial/image uploads
    }
}
```

A few notes on this config:
- `listen 443 ssl http2;` and the matching `[::]:443` line enable HTTP/2 and IPv6 — neither is required for HTTPS itself but both are good practice.
- `Upgrade` / `Connection "upgrade"` headers on `location /` allow WebSocket connections to pass through the proxy — needed if anything on the frontend (or Next.js itself) opens a WebSocket.
- `ssl_prefer_server_ciphers off;` lets the client's cipher preference win, which is the modern recommendation for TLS 1.3 — fine to leave as is.
- The `/geoserver` block proxies a separate service on port 8080 under the same domain, with its own forwarded headers and a much larger `client_max_body_size` for spatial data uploads.

No `.pem` files, no `NODE_EXTRA_CA_CERTS`, no `--experimental-https` flag in prod — those are dev-only concerns.

---

## 4. Backend (Django) — Development

### 4.1 Do you need HTTPS on Django in dev?

Only if your frontend dev server runs on HTTPS (which it does, via `mkcert`) **and** you're making requests to Django from the browser (fetch/XHR). Browsers block HTTP calls from an HTTPS page as **mixed content**. If that applies to you, serve Django over HTTPS too.

### 4.2 Serve Django over HTTPS in dev

> **Note:** `django-sslserver` is unmaintained and calls `ssl.wrap_socket()`, which was **removed in Python 3.12**. If you're on Python 3.12+ (check with `python --version`), it will fail with `AttributeError: module 'ssl' has no attribute 'wrap_socket'`. Use `django-extensions` + `runserver_plus` instead — it's actively maintained and works on current Python versions.

```bash
pip install django-extensions werkzeug pyOpenSSL
```

Rather than always listing `'django_extensions'` in `INSTALLED_APPS`, gate it behind an env flag so it can never accidentally load in production:

```python
if os.getenv("DJANGO_DEV_SSLSERVER", "False").lower() == "true":
    INSTALLED_APPS.append("django_extensions")
```

Set `DJANGO_DEV_SSLSERVER=True` only in your local `.env` — leave it unset (or `False`) on the server.

Run using the same `mkcert` certs as the frontend:
```bash
python manage.py runserver_plus \
  --cert-file /home/suman/SharedPath/PrithivieXDevelopment/code/prithivieX-frontend/localhost.pem \
  --key-file /home/suman/SharedPath/PrithivieXDevelopment/code/prithivieX-frontend/localhost-key.pem \
  8000
```

Your Django API is now reachable at `https://127.0.0.1:8000`.

> **Do not install or enable `django-extensions`' `runserver_plus` in production.** It's a dev convenience server, not meant to handle real traffic — Nginx + Gunicorn/uWSGI handle TLS and serving in prod.

<details>
<summary>Legacy option: <code>django-sslserver</code> (Python ≤3.11 only)</summary>

```bash
pip install django-sslserver
```

```python
if os.getenv("DJANGO_DEV_SSLSERVER", "False").lower() == "true":
    INSTALLED_APPS.append("sslserver")
```

```bash
python manage.py runsslserver --certificate localhost.pem --key localhost-key.pem 8000
```

This will fail on Python 3.12+ with `AttributeError: module 'ssl' has no attribute 'wrap_socket'` since the package hasn't been updated for the removed API.

</details>

### 4.3 Troubleshooting: `Unknown command: 'runserver_plus'`

If Django doesn't recognize `runserver_plus`, it means `django_extensions` isn't actually registered in `INSTALLED_APPS` for the process you're running. Check these in order:

**1. Is `DJANGO_DEV_SSLSERVER` actually set for this shell?**
```bash
DJANGO_SETTINGS_MODULE=config.settings python -c "import django; django.setup(); import os; print(os.getenv('DJANGO_DEV_SSLSERVER'))"
```
If this prints `None` or blank, your `.env` doesn't have it set, or `manage.py` isn't being run from the directory where `load_dotenv()` looks for `.env`.

**2. Is the package actually installed in the active environment?**
```bash
pip show django-extensions
```
If it says "Package(s) not found," you installed it into a different Python/conda env than the one currently active. Install it into the active env:
```bash
pip install django-extensions werkzeug pyOpenSSL
```

**3. Confirm it's registered in `INSTALLED_APPS`:**
```bash
DJANGO_SETTINGS_MODULE=config.settings python -c "import django; django.setup(); from django.conf import settings; print('django_extensions' in settings.INSTALLED_APPS)"
```
This should print `True` once both `.env` and the package install are correct.

---

## 5. Backend (Django) — Production

### 5.1 Nginx terminates TLS with the Cloudflare origin cert

Actual production config (`api.prithviex.com`), proxying to Gunicorn over a Unix socket:

```nginx
# Redirect all HTTP traffic to HTTPS
server {
    listen 80;
    server_name api.prithviex.com www.api.prithviex.com;
    return 301 https://$host$request_uri;
}

# Main HTTPS block
server {
    listen 443 ssl;
    server_name api.prithviex.com www.api.prithviex.com;

    ssl_certificate     /etc/ssl/certs/cloudflare.crt;
    ssl_certificate_key /etc/ssl/private/cloudflare.key;

    client_max_body_size 50M;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location = /favicon.ico { access_log off; log_not_found off; }

    location /static/ {
        alias /home/prithiviexadmin/prithivieXCode/prithivieX-backend/staticfiles/;
    }

    location / {
        include proxy_params;
        proxy_pass http://unix:/run/sockDir/gunicorn.sock;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

Django (via Gunicorn) only ever speaks plain HTTP over the Unix socket internally — Nginx is the only thing that touches the certificate.

> **Unix socket gotcha:** make sure Gunicorn binds to `unix:/run/sockDir/gunicorn.sock` (in its systemd unit / start command) and that the socket's file permissions allow the Nginx worker user (commonly `www-data`) to read/write it. This is a common source of silent 502 errors after a reboot or redeploy.

---

## 6. Django settings.py — one file for both environments

Rather than maintaining separate `dev.py` / `prod.py` files, drive everything from environment variables and keep a different `.env` per machine.

```python
import os

def env_list(name, default=""):
    return [item.strip() for item in os.getenv(name, default).split(",") if item.strip()]

# --- Proxy trust ---
# Only set this when Django sits behind a reverse proxy that adds X-Forwarded-Proto
# (true in prod via Nginx; false in dev if running `runsslserver` directly, since
# Django itself terminates TLS there and no proxy header exists to trust).
if os.getenv("DJANGO_BEHIND_PROXY", "True").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    USE_X_FORWARDED_HOST = True

# --- Cookies ---
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "True").lower() == "true"
CSRF_COOKIE_SECURE = os.getenv("CSRF_COOKIE_SECURE", "True").lower() == "true"
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
CSRF_COOKIE_SAMESITE = os.getenv("CSRF_COOKIE_SAMESITE", "Lax")

# --- Origins ---
CORS_ALLOWED_ORIGINS = env_list(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,https://localhost:3000",
)
CORS_ALLOW_CREDENTIALS = True

CSRF_TRUSTED_ORIGINS = env_list(
    "CSRF_TRUSTED_ORIGINS",
    "http://localhost:3000,https://localhost:3000",
)

# --- Force HTTPS + HSTS (prod only — see .env below) ---
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "False").lower() == "true"
SECURE_HSTS_SECONDS = int(os.getenv("SECURE_HSTS_SECONDS", "0"))
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("SECURE_HSTS_INCLUDE_SUBDOMAINS", "False").lower() == "true"
SECURE_HSTS_PRELOAD = os.getenv("SECURE_HSTS_PRELOAD", "False").lower() == "true"
```

### 6.1 Why `SECURE_PROXY_SSL_HEADER` needs gating

This setting tells Django to trust the `X-Forwarded-Proto` header instead of the actual connection to decide if a request is secure.

- **Prod (Nginx in front):** Django receives plain HTTP from Nginx, but Nginx adds `X-Forwarded-Proto: https`. Without this setting, Django would think every request is insecure. With it, Django reads the header correctly.
- **Dev via `runsslserver` directly (no local proxy):** Django terminates TLS itself — there's no proxy adding the header at all. If `SECURE_PROXY_SSL_HEADER` is still active here, Django looks for a header that will never arrive and wrongly concludes the request is **not** secure, which can break CSRF checks and secure-cookie behavior.

That's why it's gated behind `DJANGO_BEHIND_PROXY` rather than always on.

### 6.2 Local `.env` (dev machine)

```env
DJANGO_DEBUG=True
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1

CORS_ALLOWED_ORIGINS=https://localhost:3000
CSRF_TRUSTED_ORIGINS=https://localhost:3000

SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax

SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0

DJANGO_DEV_SSLSERVER=True
# Only set this to False if running `runsslserver` directly with no local proxy.
# If Django sits behind a local reverse proxy in dev, leave it True (or unset).
DJANGO_BEHIND_PROXY=False
```

### 6.3 Server `.env` (production)

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=<real, unique, generated secret>
DJANGO_ALLOWED_HOSTS=api.prithviex.com,217.160.56.52

CORS_ALLOWED_ORIGINS=https://prithviex.com,https://www.prithviex.com
CSRF_TRUSTED_ORIGINS=https://prithviex.com,https://www.prithviex.com,https://api.prithviex.com

SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=Lax
CSRF_COOKIE_SAMESITE=Lax

SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True

DJANGO_BEHIND_PROXY=True
```

> Only set `SAMESITE=None` if your frontend and API are on genuinely different top-level domains and you rely on cross-site cookies. With JWT auth (`rest_framework_simplejwt`), you likely don't need cross-site cookies at all — `Lax` is simpler and safer.

---

## 7. Dev HTTPS server package: install where?

| Environment | Install? | Why |
|---|---|---|
| **Dev** | Yes, if frontend dev server is HTTPS | Avoids mixed-content errors when the browser calls the API directly. Use `django-extensions` (`runserver_plus`) — see §4.2 for why `django-sslserver` is best avoided on Python 3.12+. |
| **Prod** | **No** | Nginx already terminates TLS; Gunicorn/uWSGI serve plain HTTP behind it. Dev-only convenience servers aren't built for production traffic. |

The package can stay in `requirements.txt` for both environments — what matters is that it never actually loads into `INSTALLED_APPS` in prod. See the env-gated setup in §4.2 (`DJANGO_DEV_SSLSERVER`), which keeps this safe by default.

---

## 8. Generating `DJANGO_SECRET_KEY`

Generate a new, unique key per environment — dev and prod should never share one, and neither should reuse the insecure fallback in `settings.py`.

**Option 1 — Django's built-in utility:**
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

**Option 2 — Python's `secrets` module (no Django/venv needed):**
```bash
python -c "import secrets; print(secrets.token_urlsafe(50))"
```

**Option 3 — OpenSSL:**
```bash
openssl rand -base64 48
```

Put the result straight into the environment's `.env`:
```env
DJANGO_SECRET_KEY=<paste generated value here>
```

Notes:
- Don't wrap the value in quotes in `.env` — `python-dotenv` treats everything after `=` as the literal value, so quotes would become part of the key.
- Rotating the key (e.g. after a leak) invalidates all active sessions and any signed data (password reset tokens, signed cookies) — users will be logged out.
- Make sure the server `.env` actually sets this. If it's ever missing, Django falls back to the hardcoded `"django-insecure-..."` default in `settings.py`, which is a real prod risk.

## 9. Checklist

**Dev**
- [ ] `mkcert -install` run once per machine
- [ ] `localhost.pem` / `localhost-key.pem` generated and gitignored
- [ ] Next.js `dev` script uses `--experimental-https`
- [ ] `NODE_EXTRA_CA_CERTS` set in `.env.local`
- [ ] (If needed) Django running via `runsslserver` on the same certs

**Prod**
- [ ] Nginx configured with Cloudflare origin cert for both frontend and backend domains
- [ ] `proxy_set_header X-Forwarded-Proto $scheme;` present in both Nginx server blocks
- [ ] Django `SECURE_PROXY_SSL_HEADER` set
- [ ] `django-sslserver` **not** installed/running
- [ ] `DEBUG=False`, real `SECRET_KEY`, correct `ALLOWED_HOSTS`
- [ ] `SECURE_SSL_REDIRECT` and HSTS enabled
- [ ] `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` point to real domains, not localhost