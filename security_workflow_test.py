#!/usr/bin/env python3
"""Security workflow test harness - API + evidence collection."""
import json
import os
import subprocess
import sys
import tempfile
from datetime import datetime
from http.cookiejar import MozillaCookieJar
from urllib.request import Request, urlopen
import urllib.error

BASE = "http://localhost:5000"
REPORT = []
EVIDENCE_DIR = "/home/mk/Documents/New Cicada_404/test_evidence"
os.makedirs(EVIDENCE_DIR, exist_ok=True)


def log(section, msg, status="INFO", data=None):
    entry = {"section": section, "status": status, "message": msg, "data": data}
    REPORT.append(entry)
    sym = {"PASS": "✓", "FAIL": "✗", "WARN": "!", "INFO": "·"}.get(status, "·")
    print(f"[{sym}] {section}: {msg}")
    if data:
        print(f"    {json.dumps(data, default=str)[:500]}")


def curl_json(method, path, body=None, cookie_file=None, extra_headers=None):
    cmd = ["curl", "-s", "-w", "\n__HTTP_CODE__%{http_code}", "-X", method, f"{BASE}{path}"]
    if cookie_file:
        cmd += ["-b", cookie_file, "-c", cookie_file]
    headers = ["-H", "Content-Type: application/json"]
    if extra_headers:
        for h in extra_headers:
            headers.extend(["-H", h])
    cmd += headers
    if body is not None:
        cmd += ["-d", json.dumps(body)]
    out = subprocess.check_output(cmd, text=True)
    if "__HTTP_CODE__" in out:
        body_text, code = out.rsplit("__HTTP_CODE__", 1)
        return int(code.strip()), body_text.strip()
    return 0, out


def curl_multipart(path, fields, file_path, cookie_file=None):
    cmd = [
        "curl", "-s", "-w", "\n__HTTP_CODE__%{http_code}",
        "-X", "POST", f"{BASE}{path}",
        "-F", f"snapshot=@{file_path};type=image/jpeg",
    ]
    for k, v in fields.items():
        cmd += ["-F", f"{k}={v}"]
    if cookie_file:
        cmd += ["-b", cookie_file, "-c", cookie_file]
    out = subprocess.check_output(cmd, text=True)
    body_text, code = out.rsplit("__HTTP_CODE__", 1)
    return int(code.strip()), body_text.strip()


def read_set_cookie(cookie_file):
    if not os.path.exists(cookie_file):
        return None
    with open(cookie_file) as f:
        for line in f:
            if "token" in line and not line.startswith("# Netscape"):
                parts = line.split("\t")
                if len(parts) >= 7 and parts[5] == "token":
                    return parts[6].strip()
                # libcurl #HttpOnly_ prefix line
                if line.startswith("#HttpOnly_") or line.startswith("#"):
                    segs = line.lstrip("#").split("\t")
                    if len(segs) >= 6 and segs[4] == "token":
                        return segs[5].strip()
    return None


def main():
    cookie = os.path.join(EVIDENCE_DIR, "cookies.txt")
    if os.path.exists(cookie):
        os.remove(cookie)

    # --- 1. /login_verify ---
    log("1.login_verify", "Wrong password test", "INFO")
    code, body = curl_json(
        "POST", "/login_verify",
        {"email": "mkkrish2725@gmail.com", "password": "WRONG_PASSWORD_12345"},
        cookie,
        extra_headers=["User-Agent: SecurityTestBot/1.0"],
    )
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        data = {"raw": body}
    token_after_fail = read_set_cookie(cookie)
    if code == 401 and data.get("message") == "Wrong password" and not token_after_fail:
        log("1.login_verify", "Wrong password → 401, no JWT cookie", "PASS",
            {"status": code, "body": data, "cookie_token": token_after_fail})
    else:
        log("1.login_verify", "Wrong password response unexpected", "FAIL",
            {"status": code, "body": data, "cookie_token": token_after_fail})

    # SQL injection payloads
    sqli_payloads = [
        ("admin'--@gmail.com", "sqli1"),
        ("test' OR '1'='1@gmail.com", "sqli2"),
        ("' OR '1'='1", "sqli3"),
    ]
    for email, label in sqli_payloads:
        c2 = os.path.join(EVIDENCE_DIR, f"cookies_{label}.txt")
        code, body = curl_json("POST", "/login_verify", {"email": email, "password": "x"}, c2)
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {"raw": body}
        tok = read_set_cookie(c2)
        bypass = code == 200 and data.get("success")
        if not bypass and code in (401, 400) and not tok:
            log("6.sqli", f"Payload {label} rejected (no bypass)", "PASS",
                {"email": email, "status": code, "body": data})
        else:
            log("6.sqli", f"Payload {label} may have bypassed auth", "FAIL",
                {"email": email, "status": code, "body": data, "cookie": bool(tok)})

    # Success login - try common password; document if unknown
    success_cookie = os.path.join(EVIDENCE_DIR, "cookies_success.txt")
    for pwd in ["SecurityTest!2026", "password123", "Password123!", "admin123"]:
        code, body = curl_json(
            "POST", "/login_verify",
            {"email": "mkkrish2725@gmail.com", "password": pwd},
            success_cookie,
        )
        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            data = {}
        if code == 200 and data.get("success"):
            log("1.login_verify", f"Success login with known test password", "PASS",
                {"status": code, "body": data, "password_used": "(redacted)"})
            tok = read_set_cookie(success_cookie)
            log("1.login_verify", "JWT cookie set on success", "PASS" if tok else "FAIL",
                {"has_token_cookie": bool(tok), "httponly_expected": True})
            break
    else:
        log("1.login_verify", "Success login not verified (password unknown)", "WARN",
            {"note": "Set test password in DB to complete success path"})

    # --- 2. /send_snapshot_email ---
    img = os.path.join(EVIDENCE_DIR, "test_snapshot.jpg")
    if not os.path.exists(img):
        with open(img, "wb") as f:
            f.write(bytes.fromhex(
                "ffd8ffe000104a46494600010100000100010000ffdb004300080606070605080707"
                "070909080a0c140d0c0b0b0c1912130f141d1a1f1e1d1a1c1c20242e2720222c"
                "231c1c2837292c30313434341f27393d38323c2e333432ffdb0043010909090c"
                "0b0c180d0d1832211c2132323232323232323232323232323232323232323232"
                "323232323232323232323232323232323232ffc0000b08000100000101011100"
                "021100031100ffd9"
            ))

    code, body = curl_multipart(
        "/send_snapshot_email",
        {"email": "attacker@evil.com"},
        img,
    )
    try:
        snap_data = json.loads(body)
    except json.JSONDecodeError:
        snap_data = {"raw": body}
    if code == 200:
        log("2.send_snapshot_email", "Multipart upload accepted", "PASS",
            {"status": code, "body": snap_data, "attempted_email": "attacker@evil.com"})
    else:
        log("2.send_snapshot_email", "Snapshot endpoint failed", "FAIL",
            {"status": code, "body": snap_data})

    # --- 8. Session: /me and logout ---
    if read_set_cookie(success_cookie):
        code, body = curl_json("GET", "/me", cookie_file=success_cookie)
        try:
            me = json.loads(body)
        except json.JSONDecodeError:
            me = {}
        if code == 200 and me.get("user"):
            log("8.session", "/me returns user when cookie present", "PASS", {"status": code, "user": me})
        else:
            log("8.session", "/me failed with valid cookie", "FAIL", {"status": code, "body": body})

        code, body = curl_json("POST", "/logout", cookie_file=success_cookie)
        tok_after = read_set_cookie(success_cookie)
        code2, body2 = curl_json("GET", "/me", cookie_file=success_cookie)
        if code == 200 and code2 == 401:
            log("8.session", "Logout clears session", "PASS", {"logout_status": code, "me_after": code2})
        else:
            log("8.session", "Logout/session clear issue", "WARN",
                {"logout_status": code, "me_after": code2, "token_remainder": bool(tok_after)})

    # --- 7. Dashboard / login_history ---
    hist_cookie = os.path.join(EVIDENCE_DIR, "cookies_hist.txt")
    # ensure at least one failed attempt logged
    curl_json("POST", "/login_verify",
              {"email": "workflow-test@example.com", "password": "bad"},
              hist_cookie)
    if read_set_cookie(success_cookie):
        code, body = curl_json("GET", "/login_history", cookie_file=success_cookie)
        try:
            hist = json.loads(body)
        except json.JSONDecodeError:
            hist = {}
        records = hist.get("history", [])
        has_failed = any(r.get("status") == "FAILED" for r in records)
        has_ip = any(r.get("ip_address") for r in records)
        has_ua = any(r.get("user_agent") for r in records)
        has_time = any(r.get("login_time") for r in records)
        if code == 200 and records:
            log("7.dashboard", "Login history API returns records", "PASS",
                {"count": len(records), "sample": records[:3]})
            checks = [("failed_logged", has_failed), ("ip", has_ip), ("user_agent", has_ua), ("timestamp", has_time)]
            for name, ok in checks:
                log("7.dashboard", f"History field: {name}", "PASS" if ok else "WARN", {})
        else:
            log("7.dashboard", "Login history empty or unauthorized", "WARN",
                {"status": code, "records": len(records)})

    # Unauthenticated history
    code, _ = curl_json("GET", "/login_history")
    log("7.dashboard", "History requires auth", "PASS" if code == 401 else "FAIL", {"status": code})

    # Save report
    report_path = os.path.join(EVIDENCE_DIR, "api_test_report.json")
    with open(report_path, "w") as f:
        json.dump({"timestamp": datetime.now().isoformat(), "results": REPORT}, f, indent=2)
    print(f"\nReport saved: {report_path}")
    fails = sum(1 for r in REPORT if r["status"] == "FAIL")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
